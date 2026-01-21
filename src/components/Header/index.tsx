import { A, useNavigate } from "@solidjs/router";
import { authService } from "~/services/authService";
import { dbService } from "~/services/dbService";
import "./Header.scss";

export default function Header() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    dbService.clearLocalCache();
    await authService.signOut();
    navigate("/login");
  };

  return (
    <header class="app-header">
      <div class="header-content">
        <A href="/patients" class="logo-link">
          <h1 class="logo">Relatório Evolutivo Audiométrico</h1>
        </A>
        <nav class="main-nav">
          <A href="/form" class="nav-link" activeClass="active">
            Novo Relatório
          </A>
          <A href="/patients" class="nav-link" activeClass="active">
            Pacientes
          </A>
          <A href="/settings" class="nav-link" activeClass="active">
            ⚙️ Configurações
          </A>
          <button
            onClick={handleLogout}
            class="nav-link"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              "font-size": "inherit",
              "font-family": "inherit"
            }}
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}

