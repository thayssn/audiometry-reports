// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

// Suppress benign ResizeObserver error
const _originalError = console.error;
console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("ResizeObserver loop completed")) {
        return;
    }
    _originalError(...args);
};
window.addEventListener("error", (e) => {
    if (e.message.includes("ResizeObserver loop completed")) {
        e.stopImmediatePropagation();
    }
});

mount(() => <StartClient />, document.getElementById("app")!);
