export async function PUT(request, { params }) {
  return Response.json(
    { error: "Variables are read-only from the SQLite source file." },
    { status: 405 },
  );
}

export async function DELETE(request, { params }) {
  return Response.json(
    { error: "Variables are read-only from the SQLite source file." },
    { status: 405 },
  );
}