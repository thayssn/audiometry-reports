import { A, useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { authService } from "~/services/authService";
import { dbService } from "~/services/dbService";
import "./Header.scss";

export default function Header() {
  const navigate = useNavigate();
  const [userName, setUserName] = createSignal<string>("");

  onMount(async () => {
    const user = await authService.getCurrentUser();
    if (user && user.name) {
      setUserName(user.name);
    }
  });

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
        <div class="nav-container">
          <Show when={userName()}>
            <span class="user-welcome">Olá, {userName()}</span>
          </Show>
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
      </div>
    </header>
  );
}

