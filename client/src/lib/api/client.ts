import { getToken } from "../utils/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json().catch(() => null);
    }

    const rawBody = await response.text();
    return rawBody ? { message: rawBody } : null;
};

const getErrorMessage = (data: unknown): string => {
    if (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
    ) {
        return (data as { message: string }).message;
    }

    return "Terjadi kesalahan pada server";
};

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getToken();

    const formattedEndpoint = endpoint.startsWith("/api/")
        ? endpoint.replace("/api/", "/api/v1/")
        : endpoint;

    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${formattedEndpoint}`, {
        ...options,
        headers,
    });

    // Handle No Content response
    if (response.status === 204) {
        return {} as T;
    }

    const data = await parseResponseBody(response);

    if (!response.ok) {
        throw new ApiError(getErrorMessage(data), response.status, data);
    }

    return (data && (data as any).data ? (data as any).data : (data ?? {})) as T;
}
