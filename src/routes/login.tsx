
import { createSignal } from "solid-js";
import { authService } from "~/services/authService";
import { useNavigate } from "@solidjs/router";
import toast from "solid-toast";

export default function Login() {
    const [username, setUsername] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [loading, setLoading] = createSignal(false);
    const navigate = useNavigate();

    const handleLogin = async (e: Event) => {
        e.preventDefault();
        if (!username() || !password()) return;

        setLoading(true);
        const { error } = await authService.signInWithPassword(username(), password());
        setLoading(false);

        if (error) {
            toast.error("Erro ao entrar: Verifique usuário e senha.");
            console.error(error);
        } else {
            toast.success("Login realizado com sucesso!");
            navigate("/patients", { replace: true });
        }
    };

    return (
        <div style={{
            display: "flex",
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "center",
            height: "100vh",
            padding: "20px",
            "font-family": "Arial, sans-serif"
        }}>
            <div style={{
                "max-width": "400px",
                width: "100%",
                padding: "30px",
                border: "1px solid #ddd",
                "border-radius": "8px",
                "box-shadow": "0 2px 10px rgba(0,0,0,0.1)"
            }}>
                <h1 style={{ "text-align": "center", "margin-bottom": "24px" }}>Audiometry Reports</h1>
                <form onSubmit={handleLogin}>
                    <div style={{ "margin-bottom": "16px" }}>
                        <label style={{ display: "block", "margin-bottom": "8px" }}>Usuário</label>
                        <input
                            type="text"
                            value={username()}
                            onInput={(e) => setUsername(e.currentTarget.value)}
                            placeholder="Ex: thays"
                            required
                            style={{
                                width: "100%",
                                padding: "10px",
                                "border-radius": "4px",
                                border: "1px solid #ccc"
                            }}
                        />
                    </div>
                    <div style={{ "margin-bottom": "24px" }}>
                        <label style={{ display: "block", "margin-bottom": "8px" }}>Senha</label>
                        <input
                            type="password"
                            value={password()}
                            onInput={(e) => setPassword(e.currentTarget.value)}
                            placeholder="******"
                            required
                            style={{
                                width: "100%",
                                padding: "10px",
                                "border-radius": "4px",
                                border: "1px solid #ccc"
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading()}
                        style={{
                            width: "100%",
                            padding: "12px",
                            "background-color": "#0070f3",
                            color: "white",
                            border: "none",
                            "border-radius": "4px",
                            cursor: loading() ? "not-allowed" : "pointer",
                            opacity: loading() ? 0.7 : 1
                        }}
                    >
                        {loading() ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
