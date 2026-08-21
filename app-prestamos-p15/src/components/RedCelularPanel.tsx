/**
 * EXPERIMENT — phone access over the local network.
 *
 * Shows the address a phone must dial to reach this machine, and links phones by
 * handing them a token inside a QR. See docs/QR_CELULAR.md, which also documents
 * how to remove this panel.
 *
 * The token is what authenticates the phone. The desktop admin PIN is never sent
 * over the network, so a sniffed token costs only that phone's access, and that
 * access can be revoked from here.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import qrcode from "qrcode-generator";
import { Icon } from "./Icon";
import {
  getCelularDispositivos,
  revocarCelularDispositivo,
  type CelularDispositivo
} from "../hooks/useInventory";

/** Kept in sync by hand with `PUERTO` in `src-tauri/src/celular.rs`. */
const PUERTO_CELULAR = 8080;

/** Kept in sync by hand with `PUERTO_SEGURO` in `src-tauri/src/celular.rs`. */
const PUERTO_SEGURO = 8443;

type Props = {
  adminId: number;
  adminNombre: string;
};

const construirQr = (texto: string) => {
  // Type number 0 lets the library pick the smallest QR that fits the text.
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();

  return qr.createDataURL(5, 2);
};

export function RedCelularPanel({ adminId, adminNombre }: Props) {
  const [ip, setIp] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [servidorVivo, setServidorVivo] = useState<boolean | null>(null);
  const [dispositivos, setDispositivos] = useState<CelularDispositivo[]>([]);
  const [tokenNuevo, setTokenNuevo] = useState("");
  const [etiqueta, setEtiqueta] = useState("");

  const direccion = ip ? `http://${ip}:${PUERTO_CELULAR}` : "";
  // El QR de vinculación apunta al canal seguro: es el único donde el navegador
  // deja abrir la cámara. El plano queda para bajar el certificado.
  const direccionSegura = ip ? `https://${ip}:${PUERTO_SEGURO}` : "";

  const cargarDispositivos = useCallback(async () => {
    try {
      setDispositivos(await getCelularDispositivos());
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  }, []);

  const detectar = useCallback(async () => {
    try {
      setCargando(true);
      setError("");
      const detectada = await invoke<string>("local_ip");
      setIp(detectada);

      // A failed probe means "not answering", which is exactly what we want to show.
      const vivo = await fetch(`http://${detectada}:${PUERTO_CELULAR}/salud`)
        .then((respuesta) => respuesta.ok)
        .catch(() => false);
      setServidorVivo(vivo);
    } catch (causa) {
      setIp("");
      setServidorVivo(false);
      setError(causa instanceof Error ? causa.message : String(causa));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void detectar();
    void cargarDispositivos();
  }, [detectar, cargarDispositivos]);

  const vincular = async () => {
    try {
      setError("");
      const token = await invoke<string>("celular_registrar_dispositivo", {
        profesorId: adminId,
        etiqueta: etiqueta.trim() || `Celular de ${adminNombre}`
      });
      setTokenNuevo(token);
      setEtiqueta("");
      await cargarDispositivos();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  };

  const revocar = async (id: number) => {
    try {
      await revocarCelularDispositivo(id);
      await cargarDispositivos();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  };

  const qrDireccion = useMemo(() => (direccion ? construirQr(direccion) : ""), [direccion]);
  const qrVinculacion = useMemo(
    () => (direccionSegura && tokenNuevo ? construirQr(`${direccionSegura}/?t=${tokenNuevo}`) : ""),
    [direccionSegura, tokenNuevo]
  );

  const qrCertificado = useMemo(
    () => (direccion ? construirQr(`${direccion}/ca.crt`) : ""),
    [direccion]
  );

  return (
    <div className="panel" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h3 style={{ margin: 0 }}>Acceso desde celular (en pruebas)</h3>
        <small style={{ color: "var(--text-secondary)" }}>
          El celular debe estar en el mismo WiFi que esta computadora, con los datos móviles
          apagados.
        </small>
      </div>

      {error ? <div className="feedback error">{error}</div> : null}
      {cargando ? <div style={{ color: "var(--text-secondary)" }}>Detectando red...</div> : null}

      {direccion ? (
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <img
            src={qrDireccion}
            alt={`Código QR de la dirección ${direccion}`}
            style={{
              width: "150px",
              height: "150px",
              imageRendering: "pixelated",
              background: "#fff",
              padding: "0.5rem",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)"
            }}
          />
          <div style={{ display: "grid", gap: "0.6rem", minWidth: "260px", flex: 1 }}>
            <div>
              <small style={{ color: "var(--text-secondary)" }}>Dirección actual</small>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, wordBreak: "break-all" }}>
                {direccion}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: servidorVivo ? "var(--success-base, #16a34a)" : "var(--danger-base)"
                }}
              />
              <span style={{ color: "var(--text-secondary)" }}>
                {servidorVivo ? "El servidor está respondiendo." : "El servidor no responde."}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => void detectar()}
                disabled={cargando}
                style={{ width: "auto", padding: "0.4rem 0.8rem", marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Icon name="refresh" size="0.9rem" />
                Revisar
              </button>
            </div>
            <small style={{ color: "var(--text-secondary)" }}>
              Esta dirección cambia sola cada tanto, así que nunca debe imprimirse en una
              etiqueta. Este QR siempre muestra la vigente.
            </small>
          </div>
        </div>
      ) : null}

      <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: 0 }} />

      <div style={{ display: "grid", gap: "0.6rem" }}>
        <div>
          <strong>Paso 1: confiar en esta computadora (una sola vez por teléfono)</strong>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
            El navegador solo deja abrir la cámara en una conexión cifrada. Escanea este código
            para instalar el certificado; después de eso, aunque la dirección cambie, el teléfono
            sigue confiando y no hay que repetirlo.
          </div>
        </div>
        {qrCertificado ? (
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <img
              src={qrCertificado}
              alt="Código QR para instalar el certificado"
              style={{
                width: "130px",
                height: "130px",
                imageRendering: "pixelated",
                background: "#fff",
                padding: "0.5rem",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)"
              }}
            />
            <ol style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, flex: 1, minWidth: "260px" }}>
              <li>Escanea el código: se descarga <code>prestamos-p15.crt</code>.</li>
              <li>
                <strong>iPhone:</strong> Ajustes → Perfil descargado → Instalar. Luego Ajustes →
                General → Información → Ajustes de confianza de certificados, y activa
                “Préstamos P15”.
              </li>
              <li>
                <strong>Android:</strong> Ajustes → Seguridad → Cifrado y credenciales → Instalar
                un certificado → Certificado de CA.
              </li>
            </ol>
          </div>
        ) : null}
        <small style={{ color: "var(--text-secondary)" }}>
          Si prefieres saltarte esto, el teléfono igual puede usarse: en vez de cámara en vivo
          va a pedirte una foto de la etiqueta.
        </small>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: 0 }} />

      <div style={{ display: "grid", gap: "0.6rem" }}>
        <div>
          <strong>Paso 2: vincular el celular</strong>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
            Se genera un acceso propio para ese teléfono. Tu PIN de administrador nunca sale de
            esta computadora.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={etiqueta}
            onChange={(evento) => setEtiqueta(evento.target.value)}
            placeholder={`Celular de ${adminNombre}`}
            style={{ flex: 1, minWidth: "220px" }}
          />
          <button
            type="button"
            onClick={() => void vincular()}
            disabled={!direccion}
            style={{ width: "auto", padding: "0.7rem 1.1rem" }}
          >
            Generar acceso
          </button>
        </div>
      </div>

      {tokenNuevo ? (
        <div
          className="panel"
          style={{
            display: "flex",
            gap: "1.25rem",
            flexWrap: "wrap",
            alignItems: "center",
            border: "2px solid var(--danger-base)"
          }}
        >
          <img
            src={qrVinculacion}
            alt="Código QR de vinculación"
            style={{
              width: "170px",
              height: "170px",
              imageRendering: "pixelated",
              background: "#fff",
              padding: "0.5rem",
              borderRadius: "12px"
            }}
          />
          <div style={{ flex: 1, minWidth: "260px", display: "grid", gap: "0.6rem" }}>
            <strong style={{ color: "var(--danger-base)" }}>
              Escanéalo ahora con el celular que quieres vincular.
            </strong>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
              Este código <strong>da acceso</strong>: quien lo escanee entra. No lo imprimas, no
              lo compartas y no le tomes foto. No se puede volver a mostrar — si lo pierdes,
              genera otro y revoca este.
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => setTokenNuevo("")}
              style={{ width: "auto", padding: "0.5rem 0.9rem" }}
            >
              Ya lo escaneé, ocultar
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "0.5rem" }}>
        <strong>Celulares vinculados</strong>
        {dispositivos.length === 0 ? (
          <div style={{ color: "var(--text-secondary)" }}>Todavía no hay ninguno.</div>
        ) : (
          dispositivos.map((dispositivo) => (
            <div
              key={dispositivo.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                padding: "0.7rem 0.9rem",
                borderRadius: "10px",
                background: "var(--surface-sunken)"
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{dispositivo.etiqueta}</div>
                <small style={{ color: "var(--text-secondary)" }}>
                  {dispositivo.nombre_profesor} · último uso:{" "}
                  {dispositivo.ultimo_uso ?? "nunca"}
                </small>
              </div>
              <button
                type="button"
                onClick={() => void revocar(dispositivo.id)}
                style={{
                  width: "auto",
                  padding: "0.5rem 0.9rem",
                  background: "var(--danger-base)",
                  borderColor: "var(--danger-base)"
                }}
              >
                Revocar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
