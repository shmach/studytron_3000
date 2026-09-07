from course_parser import vault
from fastapi import FastAPI

app = FastAPI()

vault_path = "C:/Users/mmach/dev/repos/obsidian/shmach/estudos"


@app.get("/")
def hello_world():
    return {"Hello": "World"}


@app.get("/vault")
def get_content_path():
    return {"Content path": vault_path}


@app.get("/courses")
def get_vault_path():
    vault_content = vault.load_vault(vault_path)
    return {"response": vault_content}


@app.get("/courses/{slug}")
def get_course_by_slug(slug: str):
    course_path = f"{vault_path}/{slug}"
    course_content = vault.load_course(course_path)
    return {"course": course_content}
