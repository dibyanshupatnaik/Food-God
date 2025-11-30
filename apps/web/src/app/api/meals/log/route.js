import { pythonApiFetch } from "@/app/api/utils/pythonClient";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { data } = await pythonApiFetch("/meals/log", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json(data);
  } catch (error) {
    console.error("Error logging meal via Python backend:", error);
    return Response.json({ error: "Failed to log meal" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = query ? `/meals/log?${query}` : "/meals/log";
    const { data } = await pythonApiFetch(path);
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching meal logs:", error);
    return Response.json(
      { error: "Failed to fetch meal logs" },
      { status: 500 },
    );
  }
}
