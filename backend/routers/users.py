from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from deps import get_db, get_current_user
from auth import hash_password

# Se define el router con prefijo /usuarios
router = APIRouter(prefix="/usuarios", tags=["Users"])

# Modelo Pydantic para validar datos de entrada al crear usuario
class UsuarioCreate(BaseModel):
    #creamos una clase que usaremos para guardar las propiedades de el nuevo usuario
    nombre: str
    correo: str
    telefono: str
    matricula: int
    password: str
    rol_id: int

class ModificarApodo(BaseModel):
    apodo: str

@router.post("/")#damos referencia a el metodo post
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    #creamos una funcion, entre parentesis establecemos los datos y su tipo
    """Usuarios es igual a la clase, lo que ahce que usuario sea una instancia temporal que
    debe recibir los valores que tiene, db nos sirve para las dependencias y asi conectar con la bd"""
    # Verificar si ya existe un usuario con el mismo correo
    existente = db.query(models.Usuario).filter(models.Usuario.correo == usuario.correo).first()
    #existente realiza una busqueda, donde en la tabla de usuarios, filtramos a los usuarios por correo y buscamos
    #si existe otro con el mismo
    if existente:
        #si existente es true es pq si se encontro un usuario con el mismo correo que se quiere usar en el registro
        raise HTTPException(
            status_code=400,
            detail="El correo ya esta registrado"
        )

    # creamos un nuevo usaurio
    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        correo=usuario.correo,
        telefono=usuario.telefono,
        matricula=usuario.matricula,
        password=hash_password(usuario.password),  # se cifra la contrasena
        rol_id=usuario.rol_id
    ) 
    """Lo primero que hacemos es crear nuevo usaurio que es una instancia de la clase de usuario
    esto para obtener sus propiedades, luego de esto, lo que hacemos es que a cada variable que tenemos le asignamos
    el valor que tiene en la clase en su modelo (dicho de otra forma el objeto temporal que se crea)"""
    
    db.add(nuevo_usuario)
    #agregamos a el nuevo usuario, para esto usamos la conexion con la bd y enviamos los datos que tenemos#
    db.commit()
    #confirmamos envio
    db.refresh(nuevo_usuario)
    #refrescamos a el objeto temporal para que se vacie
    return nuevo_usuario#regresamos a el nuevo usuario

@router.get("/")  # ruta protegida
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)  # requiere usuario autenticado
):
    return db.query(models.Usuario).all()

@router.delete("/{usuario_id}")  # eliminar por id, ruta protegida
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )
    db.delete(usuario)
    db.commit()
    return {"mensaje": f"Usuario {usuario_id} eliminado correctamente"}

@router.delete("/matricula/{matricula}")  # eliminar por matricula, ruta protegida
def eliminar_usuario_por_matricula(
    matricula: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.matricula == matricula).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )
    db.delete(usuario)
    db.commit()
    return {"mensaje": f"Usuario con matricula {matricula} eliminado correctamente"}



@router.get("/me")
def obtener_usuario_actual(
    current_user: models.Usuario = Depends(get_current_user)
):
    # esta funcion devuelve el usuario actual segun el token
    # get_current_user ya valida el token y busca el usuario en la base
    #de esta forma mantenemos la seguridad de que el usuario y token esten unidos
    return current_user

@router.put("/modificar-apodo") #Ruth- añadir modificar apodo, ruta protegida
def modificar_apodo(
    datos: ModificarApodo,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    # actualizar el apodo del usuario autenticado
    current_user.apodo = datos.apodo

    db.commit()
    db.refresh(current_user)

    return {"mensaje": "Apodo actualizado correctamente"}