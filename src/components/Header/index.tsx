import { A } from "@solidjs/router";
import "./Header.scss";

export default function Header() {
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
        </nav>
      </div>
    </header>
  );
}

