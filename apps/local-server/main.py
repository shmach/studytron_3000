from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from local_server.routes import courses, vault

app = FastAPI()

app.include_router(router=vault.router)
app.include_router(router=courses.router)


@app.get("/")
def hello_world():
    return {"Hello": "World"}
