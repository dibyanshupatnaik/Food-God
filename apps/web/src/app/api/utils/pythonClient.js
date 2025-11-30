const PYTHON_API_BASE_URL =
  process.env.PYTHON_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function pythonApiFetch(path, init = {}) {
  const targetUrl = `${PYTHON_API_BASE_URL}${path}`;
  const response = await fetch(targetUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || "Python backend error";
    throw new Error(detail);
  }

  return { status: response.status, data };
}

export { PYTHON_API_BASE_URL };
