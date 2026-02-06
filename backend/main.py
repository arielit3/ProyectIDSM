from fastapi import FastAPI
from routers import users, login

app = FastAPI()

app.include_router(login.router)
app.include_router(users.router)
