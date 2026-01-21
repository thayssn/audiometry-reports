import { createEffect, createSignal, onMount, ParentComponent, Show } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { authService, UserProfile } from "~/services/authService";

const AuthGuard: ParentComponent = (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = createSignal<UserProfile | null>(null);
    const [loading, setLoading] = createSignal(true);

    onMount(async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);

            if (!currentUser && location.pathname !== "/login") {
                navigate("/login", { replace: true });
            }
        } catch (e) {
            console.error("Auth check failed", e);
        } finally {
            setLoading(false);
        }
    });

    return (
        <Show when={!loading()} fallback={
            <div style={{ display: "flex", "justify-content": "center", "align-items": "center", height: "100vh" }}>
                Loading...
            </div>
        }>
            {props.children}
        </Show>
    );
};

export default AuthGuard;
