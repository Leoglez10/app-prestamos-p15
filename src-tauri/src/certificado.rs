//! Certificados para servir HTTPS en la red local.
//!
//! Por qué existe esto: una cámara en vivo dentro de la página necesita
//! `getUserMedia`, y esa API solo funciona en contexto seguro. Sobre HTTP plano
//! el navegador la bloquea sin preguntar. No hay otra API de cámara en la web.
//!
//! El problema de fondo es que la dirección de esta computadora cambia sola, y un
//! certificado va atado a una dirección. Por eso se generan dos cosas:
//!
//! - Una **autoridad propia** (CA), creada una vez y guardada junto a la base.
//!   El teléfono confía en ella una sola vez.
//! - Un **certificado por dirección**, firmado por esa autoridad y regenerado en
//!   cada arranque para la dirección vigente.
//!
//! Así, cuando la dirección cambie, el certificado nuevo ya viene firmado por una
//! autoridad en la que el teléfono ya confía y no hay que reinstalar nada.

use std::fs;
use std::net::IpAddr;
use std::path::{Path, PathBuf};

use rcgen::{
	date_time_ymd, BasicConstraints, CertificateParams, DnType, ExtendedKeyUsagePurpose, IsCa,
	Issuer, KeyPair, KeyUsagePurpose, SanType,
};

/// Nombre con el que el teléfono va a ver la autoridad en su lista de confianza.
const NOMBRE_CA: &str = "Prestamos P15 - Autoridad local";

pub struct MaterialTls {
	/// Certificado del servidor y su cadena, en PEM.
	pub cert_pem: String,
	pub llave_pem: String,
	/// Certificado público de la autoridad, el que se instala en el teléfono.
	pub ca_pem: String,
}

fn ruta_ca(carpeta: &Path) -> (PathBuf, PathBuf) {
	(carpeta.join("ca-p15.pem"), carpeta.join("ca-p15.key"))
}

/// Parámetros de la autoridad, en un solo lugar.
///
/// Se usan al crearla y, en cada arranque, para reconstruir el emisor. Reconstruir
/// evita traer un parser X.509 entero solo para releer un certificado que
/// escribimos nosotros; a cambio, estos parámetros no pueden cambiar sin invalidar
/// las autoridades ya instaladas en los teléfonos.
fn params_ca() -> CertificateParams {
	let mut params = CertificateParams::default();
	params.is_ca = IsCa::Ca(BasicConstraints::Constrained(0));
	// rcgen deja por defecto una vigencia de 1975 a 4096. Una ventana absurda es
	// justo lo que hace que un teléfono rechace el certificado sin explicar nada,
	// así que se acota a algo que un validador reconozca como normal.
	params.not_before = date_time_ymd(2020, 1, 1);
	params.not_after = date_time_ymd(2040, 1, 1);
	params.key_usages = vec![
		KeyUsagePurpose::KeyCertSign,
		KeyUsagePurpose::CrlSign,
		KeyUsagePurpose::DigitalSignature,
	];
	params
		.distinguished_name
		.push(DnType::CommonName, NOMBRE_CA);
	params
		.distinguished_name
		.push(DnType::OrganizationName, "Preparatoria Quince");

	params
}

/// Carga la autoridad ya existente, o la crea la primera vez.
///
/// La llave privada se queda en el disco de esta computadora y nunca se sirve por
/// la red: quien la tenga puede firmar certificados en los que el teléfono confía.
fn autoridad(carpeta: &Path) -> Result<(String, KeyPair), String> {
	let (ruta_cert, ruta_llave) = ruta_ca(carpeta);

	if ruta_cert.exists() && ruta_llave.exists() {
		let pem = fs::read_to_string(&ruta_cert)
			.map_err(|error| format!("No se pudo leer la autoridad local: {error}"))?;
		let llave_pem = fs::read_to_string(&ruta_llave)
			.map_err(|error| format!("No se pudo leer la llave de la autoridad: {error}"))?;
		let llave = KeyPair::from_pem(&llave_pem)
			.map_err(|error| format!("La llave de la autoridad no es válida: {error}"))?;

		return Ok((pem, llave));
	}

	let llave = KeyPair::generate()
		.map_err(|error| format!("No se pudo generar la llave de la autoridad: {error}"))?;

	let params = params_ca();
	let cert = params
		.self_signed(&llave)
		.map_err(|error| format!("No se pudo crear la autoridad local: {error}"))?;

	fs::write(&ruta_cert, cert.pem())
		.map_err(|error| format!("No se pudo guardar la autoridad local: {error}"))?;
	fs::write(&ruta_llave, llave.serialize_pem())
		.map_err(|error| format!("No se pudo guardar la llave de la autoridad: {error}"))?;

	restringir_permisos(&ruta_llave);

	Ok((cert.pem(), llave))
}

/// La llave de la autoridad solo debe poder leerla su dueño.
#[cfg(unix)]
fn restringir_permisos(ruta: &Path) {
	use std::os::unix::fs::PermissionsExt;
	let _ = fs::set_permissions(ruta, fs::Permissions::from_mode(0o600));
}

#[cfg(not(unix))]
fn restringir_permisos(_ruta: &Path) {}

/// Emite el certificado del servidor para la dirección de hoy, firmado por la
/// autoridad local.
pub fn material_para(carpeta: &Path, ip: IpAddr) -> Result<MaterialTls, String> {
	let (ca_pem, ca_llave) = autoridad(carpeta)?;

	let llave = KeyPair::generate()
		.map_err(|error| format!("No se pudo generar la llave del servidor: {error}"))?;

	let mut params = CertificateParams::default();
	// Los navegadores modernos ignoran el CommonName y solo miran el SAN, asi que
	// la direccion tiene que ir aca o el certificado no sirve para nada.
	params.subject_alt_names = vec![SanType::IpAddress(ip)];

	// Apple exige desde iOS 13 que un certificado de servidor TLS declare
	// `id-kp-serverAuth` en ExtendedKeyUsage. rcgen no pone ninguna EKU por
	// defecto, y sin ella Safari corta con "Esta conexion no es privada" aunque la
	// autoridad este instalada y en confianza — un sintoma que no apunta a nada.
	params.extended_key_usages = vec![ExtendedKeyUsagePurpose::ServerAuth];
	// La firma ECDSA del handshake es lo unico que hace esta llave. `keyEncipherment`
	// seria para transporte de clave RSA, que aca no existe.
	params.key_usages = vec![KeyUsagePurpose::DigitalSignature];

	// Vigencia corta, del orden de un ano: se reemite en cada arranque de todas
	// formas, y las vigencias largas son las que los navegadores rechazan.
	// Se evita nombrar el tipo de fecha de rcgen para no sumar `time` como
	// dependencia directa solo por una firma.
	use chrono::Datelike;
	let hoy = chrono::Local::now().date_naive();
	let desde = hoy - chrono::Duration::days(1);
	let hasta = hoy + chrono::Duration::days(360);
	params.not_before = date_time_ymd(desde.year(), desde.month() as u8, desde.day() as u8);
	params.not_after = date_time_ymd(hasta.year(), hasta.month() as u8, hasta.day() as u8);
	params
		.distinguished_name
		.push(DnType::CommonName, ip.to_string());

	let emisor = Issuer::new(params_ca(), ca_llave);

	let cert = params
		.signed_by(&llave, &emisor)
		.map_err(|error| format!("No se pudo firmar el certificado del servidor: {error}"))?;

	Ok(MaterialTls {
		// La cadena lleva el certificado del servidor y despues el de la autoridad,
		// para que un telefono que ya confia en ella pueda validarla completa.
		cert_pem: format!("{}{}", cert.pem(), ca_pem),
		llave_pem: llave.serialize_pem(),
		ca_pem,
	})
}

#[cfg(test)]
mod tests {
	use super::*;

	fn carpeta_temporal(nombre: &str) -> PathBuf {
		let ruta = std::env::temp_dir().join(format!("p15-cert-{nombre}"));
		let _ = fs::remove_dir_all(&ruta);
		fs::create_dir_all(&ruta).expect("no se pudo crear la carpeta de prueba");
		ruta
	}

	#[test]
	fn la_autoridad_se_crea_una_sola_vez() {
		let carpeta = carpeta_temporal("reuso");

		let primera = material_para(&carpeta, "10.0.0.1".parse().unwrap()).expect("primera");
		let segunda = material_para(&carpeta, "10.0.0.2".parse().unwrap()).expect("segunda");

		// Este es el punto de todo el diseño: si la autoridad cambiara con cada
		// arranque, el teléfono tendría que volver a confiar en ella cada vez.
		assert_eq!(primera.ca_pem, segunda.ca_pem, "la autoridad debe persistir");
		assert_ne!(
			primera.cert_pem, segunda.cert_pem,
			"cada dirección lleva su propio certificado"
		);
	}

	#[test]
	fn la_vigencia_del_servidor_es_corta() {
		// rcgen deja por defecto 1975-4096. Una ventana asi hace que un telefono
		// rechace el certificado sin decir por que, y el sintoma seria "la camara
		// no abre", que no apunta a nada. Por eso se vigila.
		let carpeta = carpeta_temporal("vigencia");
		let material = material_para(&carpeta, "10.0.0.1".parse().unwrap()).expect("material");

		let salida = std::process::Command::new("openssl")
			.args(["x509", "-noout", "-dates"])
			.stdin(std::process::Stdio::piped())
			.stdout(std::process::Stdio::piped())
			.spawn()
			.and_then(|mut proceso| {
				use std::io::Write;
				proceso
					.stdin
					.as_mut()
					.expect("stdin")
					.write_all(material.cert_pem.as_bytes())?;
				proceso.wait_with_output()
			});

		let Ok(salida) = salida else {
			// Sin openssl no se puede comprobar; no es motivo para fallar la suite.
			return;
		};

		let texto = String::from_utf8_lossy(&salida.stdout);
		assert!(!texto.contains("1975"), "vigencia por defecto de rcgen: {texto}");
		assert!(!texto.contains("4096"), "vigencia por defecto de rcgen: {texto}");
	}

	/// Apple exige desde iOS 13 que un certificado de servidor TLS lleve la
	/// extension ExtendedKeyUsage con id-kp-serverAuth. Sin ella Safari lo rechaza
	/// con "Esta conexion no es privada" aunque la autoridad este instalada y en
	/// confianza, que es un sintoma que no apunta a nada.
	#[test]
	fn el_certificado_declara_que_es_de_servidor() {
		let carpeta = carpeta_temporal("eku");
		let material = material_para(&carpeta, "10.15.30.10".parse().unwrap()).expect("material");

		let salida = std::process::Command::new("openssl")
			.args(["x509", "-noout", "-text"])
			.stdin(std::process::Stdio::piped())
			.stdout(std::process::Stdio::piped())
			.spawn()
			.and_then(|mut proceso| {
				use std::io::Write;
				proceso
					.stdin
					.as_mut()
					.expect("stdin")
					.write_all(material.cert_pem.as_bytes())?;
				proceso.wait_with_output()
			});

		let Ok(salida) = salida else {
			// Sin openssl no se puede comprobar; no es motivo para fallar la suite.
			return;
		};

		let texto = String::from_utf8_lossy(&salida.stdout);
		assert!(
			texto.contains("TLS Web Server Authentication"),
			"falta el EKU serverAuth: {texto}"
		);
	}

	#[test]
	fn el_material_es_pem_valido() {
		let carpeta = carpeta_temporal("pem");
		let material = material_para(&carpeta, "192.168.1.5".parse().unwrap()).expect("material");

		assert!(material.ca_pem.starts_with("-----BEGIN CERTIFICATE-----"));
		assert!(material.llave_pem.contains("PRIVATE KEY"));
		// La cadena son dos certificados: el del servidor y el de la autoridad.
		assert_eq!(material.cert_pem.matches("BEGIN CERTIFICATE").count(), 2);
	}

	#[test]
	fn la_llave_de_la_autoridad_no_queda_legible_para_otros() {
		let carpeta = carpeta_temporal("permisos");
		material_para(&carpeta, "10.0.0.1".parse().unwrap()).expect("material");

		#[cfg(unix)]
		{
			use std::os::unix::fs::PermissionsExt;
			let (_, ruta_llave) = ruta_ca(&carpeta);
			let modo = fs::metadata(&ruta_llave).expect("metadata").permissions().mode();
			assert_eq!(modo & 0o077, 0, "solo el dueño puede leer la llave");
		}
	}
}
