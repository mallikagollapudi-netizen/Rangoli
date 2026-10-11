from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from bson.errors import InvalidId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, AliasChoices
from typing import List, Optional, Literal, Annotated
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=False)
    id: Optional[PyObjectId] = Field(default=None, validation_alias=AliasChoices("_id", "id"))

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        return self.model_dump(exclude={"id"})


class Stroke(BaseModel):
    color: str
    width: float
    kind: Literal["free", "line"] = "free"
    points: List[List[float]]


class GridConfig(BaseModel):
    layout: Literal["square", "rotated", "triangle"]
    rows: int = Field(ge=1, le=30)
    cols: int = Field(ge=1, le=30)
    area: List[float]  # x, y, w, h


class ArtworkIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    mode: Literal["free", "dot"]
    grid: Optional[GridConfig] = None
    background: str
    width: float
    height: float
    strokes: List[Stroke] = []


class Artwork(BaseDocument, ArtworkIn):
    created_at: str
    updated_at: str


def oid(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Artwork not found")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@api_router.get("/")
async def root():
    return {"message": "Rangoli Studio API"}


@api_router.get("/artworks", response_model=List[Artwork])
async def list_artworks():
    docs = await db.artworks.find().sort("updated_at", -1).to_list(500)
    return [Artwork.from_mongo(d) for d in docs]


@api_router.post("/artworks", response_model=Artwork)
async def create_artwork(body: ArtworkIn):
    ts = now()
    art = Artwork(**body.model_dump(), created_at=ts, updated_at=ts)
    res = await db.artworks.insert_one(art.to_mongo())
    art.id = str(res.inserted_id)
    return art


@api_router.get("/artworks/{art_id}", response_model=Artwork)
async def get_artwork(art_id: str):
    doc = await db.artworks.find_one({"_id": oid(art_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return Artwork.from_mongo(doc)


@api_router.put("/artworks/{art_id}", response_model=Artwork)
async def update_artwork(art_id: str, body: ArtworkIn):
    data = body.model_dump()
    data["updated_at"] = now()
    doc = await db.artworks.find_one_and_update(
        {"_id": oid(art_id)}, {"$set": data}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return Artwork.from_mongo(doc)


@api_router.delete("/artworks/{art_id}")
async def delete_artwork(art_id: str):
    res = await db.artworks.delete_one({"_id": oid(art_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
