export class APIError extends Error {
  constructor(message, { status, fields } = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.fields = fields;
  }
}

export async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiError = payload?.error;
    throw new APIError(apiError?.message || `Request failed (${response.status})`, {
      status: response.status,
      fields: apiError?.fields,
    });
  }

  return payload;
}
