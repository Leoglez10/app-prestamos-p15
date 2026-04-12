import { Link } from "react-router-dom";
import "../App.css";
import logoP15 from "../../img/logo-p15.png";

export default function Home() {
  return (
    <main className="dashboard home-main" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      alignContent: 'center',
      minHeight: '100dvh',
      gap: 'clamp(0.9rem, 2vh, 2rem)',
      padding: 'clamp(0.75rem, 1.4vh, 1.25rem)',
      background: 'var(--surface-sunken)',
      width: '100%',
      maxWidth: 'none',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      
      <div className="home-hero" style={{ textAlign: 'center', maxWidth: '980px', width: '100%', margin: '0 auto', display: 'grid', placeItems: 'center' }}>
        <img
          className="home-logo"
          src={logoP15}
          alt="Logo Preparatoria Quince"
          style={{
            width: 'clamp(180px, 24vh, 300px)',
            height: 'auto',
            marginBottom: 'clamp(0.4rem, 1vh, 1rem)',
            filter: 'drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18))'
          }}
        />
        <h1 className="home-title" style={{ 
          fontSize: 'clamp(2.1rem, 4.8vh, 3.2rem)', 
          marginBottom: 'clamp(0.35rem, 0.9vh, 0.9rem)', 
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          fontWeight: '900'
        }}>
          Control de Préstamos P15
        </h1>
        <p className="home-subtitle" style={{
          fontSize: 'clamp(1.05rem, 2.4vh, 1.28rem)',
          color: 'var(--text-secondary)',
          lineHeight: '1.35',
          margin: 0
        }}>
          Bienvenido al sistema automatizado de control de inventario y préstamos de equipo audiovisual.
        </p>
      </div>

      <div className="home-actions" style={{
        display: 'flex',
        gap: 'clamp(0.8rem, 1.8vh, 1.5rem)',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'stretch',
        marginTop: 'clamp(0.3rem, 1vh, 1.2rem)',
        width: '100%',
        maxWidth: '980px',
        marginInline: 'auto'
      }}>
        <Link to="/kiosko" className="hero-button primary home-card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1.15rem, 2.35vh, 2.2rem)',
          background: 'var(--brand-primary)',
          color: '#ffffff',
          textDecoration: 'none',
          borderRadius: '24px',
          width: 'clamp(260px, 31vw, 360px)',
          minHeight: 'clamp(220px, 27vh, 300px)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)',
        }}>
          <span className="home-card-emoji" style={{ fontSize: 'clamp(1.8rem, 3.2vh, 2.6rem)', marginBottom: '0.55rem' }}>🎓</span>
          <span style={{ fontSize: 'clamp(1.32rem, 2.8vh, 1.75rem)', fontWeight: 'bold' }}>Soy Profesor</span>
          <span style={{ fontSize: 'clamp(0.95rem, 2.05vh, 1.08rem)', opacity: 0.85, marginTop: '0.55rem', textAlign: 'center' }}> Préstamo y devolución rápida con tu código UDG</span>
        </Link>

        <Link to="/admin" className="hero-button secondary home-card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1.15rem, 2.35vh, 2.2rem)',
          background: 'var(--surface-default)',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          borderRadius: '24px',
          width: 'clamp(260px, 31vw, 360px)',
          minHeight: 'clamp(220px, 27vh, 300px)',
          border: '2px solid var(--border-subtle)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>
          <span className="home-card-emoji" style={{ fontSize: 'clamp(1.8rem, 3.2vh, 2.6rem)', marginBottom: '0.55rem' }}>⚙️</span>
          <span style={{ fontSize: 'clamp(1.32rem, 2.8vh, 1.75rem)', fontWeight: 'bold' }}>Administrador</span>
          <span style={{ fontSize: 'clamp(0.95rem, 2.05vh, 1.08rem)', color: 'var(--text-secondary)', marginTop: '0.55rem', textAlign: 'center' }}> Control total de inventario, altas y reportes</span>
        </Link>
      </div>

      <style>{`
        .hero-button:hover {
          transform: translateY(-8px) scale(1.02);
        }
        .hero-button.primary:hover {
          boxShadow: 0 20px 40px rgba(37, 99, 235, 0.4) !important;
          filter: brightness(0.9);
        }
        .hero-button.secondary:hover {
          border-color: var(--brand-primary) !important;
          boxShadow: 0 20px 40px rgba(0,0,0,0.08) !important;
        }
        @media (min-width: 1280px) and (min-height: 800px) {
          .home-main {
            gap: 1.65rem !important;
            padding: 1.35rem 2rem !important;
          }
          .home-hero {
            max-width: 1150px !important;
          }
          .home-logo {
            width: 320px !important;
          }
          .home-title {
            font-size: 3.45rem !important;
            margin-bottom: 0.85rem !important;
          }
          .home-subtitle {
            font-size: 1.35rem !important;
            line-height: 1.45 !important;
            max-width: 920px;
            margin: 0 auto !important;
          }
          .home-actions {
            flex-wrap: nowrap !important;
            gap: 1.5rem !important;
            margin-top: 0.8rem !important;
            justify-content: center !important;
            max-width: 1100px !important;
          }
          .home-card {
            width: 400px !important;
            min-height: 310px;
            padding: 1.9rem !important;
          }
          .home-card-emoji {
            font-size: 2.7rem !important;
          }
          .home-card span {
            letter-spacing: 0.01em;
          }
        }
        @media (max-height: 760px) {
          .home-main {
            gap: 0.75rem !important;
            padding: 0.6rem !important;
          }
          .home-logo {
            width: 155px !important;
            margin-bottom: 0.35rem !important;
          }
          .home-title {
            font-size: 1.85rem !important;
            margin-bottom: 0.2rem !important;
          }
          .home-subtitle {
            font-size: 1rem !important;
            line-height: 1.25 !important;
          }
          .home-actions {
            margin-top: 0.25rem !important;
            gap: 0.7rem !important;
          }
          .home-card {
            width: 230px !important;
            padding: 0.9rem !important;
          }
          .home-card-emoji {
            font-size: 1.7rem !important;
            margin-bottom: 0.35rem !important;
          }
        }
      `}</style>
    </main>
  );
}
