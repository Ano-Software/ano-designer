import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiErrorBody = {
  message: string;
  code?: string;
  details?: Record<string, unknown> | string | null;
};

export type ApiErrorResponse = {
  data: null;
  error: ApiErrorBody;
};

type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

export function jsonResponse<T>(body: ApiResponse<T>, init?: ResponseInit) {
  const headers = new Headers(DEFAULT_HEADERS);

  if (init?.headers) {
    const custom = new Headers(init.headers);
    custom.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const status = init?.status ?? 200;
  return new NextResponse(JSON.stringify(body), {
    status,
    headers,
  });
}

export function success<T>(data: T, init?: Omit<ResponseInit, "status"> & { status?: number }) {
  return jsonResponse<T>(
    {
      data,
      error: null,
    },
    {
      status: init?.status ?? 200,
      headers: init?.headers,
    }
  );
}

export function created<T>(data: T, init?: Omit<ResponseInit, "status">) {
  return success(data, { ...init, status: 201 });
}

export function noContent(init?: Omit<ResponseInit, "status">) {
  return success(null, { ...init, status: 204 });
}

export function error(
  body: ApiErrorBody,
  init?: Omit<ResponseInit, "status"> & { status?: number }
) {
  return jsonResponse<never>(
    {
      data: null,
      error: body,
    },
    {
      status: init?.status ?? 500,
      headers: init?.headers,
    }
  );
}
