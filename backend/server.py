# This app (Rangoli Studio) is fully offline: artworks are stored on-device
# and the frontend never calls a server. This file is kept as a minimal stub
# so `supervisorctl start backend` still works if someone boots it; it
# answers 410 Gone on every route. No database, no routes, no data.
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def gone(request: Request, path: str = ""):
    return JSONResponse(status_code=410, content={"detail": "Rangoli Studio is fully offline; this server was retired."})
