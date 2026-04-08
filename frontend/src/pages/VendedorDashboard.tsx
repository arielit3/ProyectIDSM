import React, { useState, useEffect, useCallback } from "react";
import { 
  crearProductoConImagen,
  listarMisProductos, 
  actualizarProducto, 
  eliminarProducto, 
  toggleProductoVisibilidad,
  type Producto 
} from "../services/products";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

// ============================================================================
// CONSTANTES
// ============================================================================

// Lista de categorias predefinidas para los productos
// El vendedor debe seleccionar una de estas opciones al publicar
const CATEGORIAS_PRODUCTOS = [
  "Postres",
  "Snacks",
  "Bebidas",
  "Lonches",
  "Comida Corrida",
  "Saludable",
  "Desayunos",
  "Otros"
];

// ============================================================================
// INTERFAZ DE PROPS
// ============================================================================

interface VendedorDashboardProps {
  user: Usuario;  // Datos del usuario vendedor autenticado
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  
  // ==========================================================================
  // ESTADOS DEL COMPONENTE
  // ==========================================================================

  // Estados de la interfaz
  const [showNewProductForm, setShowNewProductForm] = useState(false);     // Muestra u oculta formulario de nuevo producto
  const [showGestionProductos, setShowGestionProductos] = useState(false); // Muestra u oculta panel de gestion
  const [isLoading, setIsLoading] = useState(false);                       // Indica si se esta procesando una peticion
  const [error, setError] = useState("");                                  // Mensaje de error
  const [success, setSuccess] = useState("");                              // Mensaje de exito
  const [refrescando, setRefrescando] = useState(false);                   // Estado para el boton de refrescar

  // Estados de datos
  const [productos, setProductos] = useState<Producto[]>([]);              // Lista de productos del vendedor
  const [cargandoProductos, setCargandoProductos] = useState(true);        // Indica si se estan cargando los productos
  const [imagenPreview, setImagenPreview] = useState<string | null>(null); // URL de previsualizacion de imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);         // Archivo de imagen seleccionado
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null); // Producto que se esta editando

  // Estado del formulario (para crear o editar)
  const [formData, setFormData] = useState({
    nombre: "",      // Nombre del producto
    descripcion: "", // Descripcion detallada
    precio: "",      // Precio en formato texto (se convierte a numero al enviar)
    stock: "",       // Cantidad disponible
    categoria: CATEGORIAS_PRODUCTOS[0], // Categoria seleccionada (por defecto la primera)
  });

  // ==========================================================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================================================

  /**
   * Carga todos los productos del vendedor actual desde el backend.
   * Esta funcion NO tiene validacion interna. Se encarga SOLO de hacer la peticion
   * y actualizar el estado. La validacion de user.id se hace en el useEffect.
   */
  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const data = await listarMisProductos();
      // Asegurar que los datos son consistentes (todos los stocks como numeros)
      const productosNormalizados = data.map(p => ({
        ...p,
        stock: typeof p.stock === 'string' ? parseInt(p.stock) : p.stock
      }));
      setProductos(productosNormalizados);
      console.log("Productos cargados:", productosNormalizados.length);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError("No se pudieron cargar los productos");
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  /**
   * Refresca manualmente los productos (con indicador visual).
   * Util en movil donde no existe el boton de recargar pagina del navegador.
   */
  const handleRefrescar = useCallback(async () => {
    setRefrescando(true);
    await cargarProductos();
    setTimeout(() => {
      setRefrescando(false);
      setSuccess("Productos actualizados");
      setTimeout(() => setSuccess(""), 2000);
    }, 500);
  }, [cargarProductos]);

  /**
   * Efecto que carga los productos cuando el usuario esta disponible.
   * 
   * IMPORTANTE: Este efecto se ejecuta cuando el componente se monta Y cuando
   * user.id cambia (de undefined a su valor real despues del login).
   * La dependencia user?.id es crucial para que la carga ocurra exactamente
   * cuando el usuario esta listo, resolviendo el problema de la primera carga.
   */
  useEffect(() => {
    if (user?.id) {
      console.log("Cargando productos para vendedor ID:", user.id);
      cargarProductos();
    }
  }, [user?.id, cargarProductos]);

  // ==========================================================================
  // FUNCIONES DE MANEJO DE FORMULARIOS
  // ==========================================================================

  /**
   * Maneja los cambios en los campos del formulario
   * Actualiza el estado formData con el nuevo valor
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(""); // Limpia errores al escribir
  };

  /**
   * Maneja la seleccion de una imagen
   * Guarda el archivo y crea una URL de previsualizacion
   */
  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Construye la URL completa para acceder a una imagen guardada
   * Retorna null si no hay nombre de imagen
   */
  const getImagenUrl = (imagenNombre: string | null): string | null => {
    if (!imagenNombre) return null;
    return `${API_URL}/uploads/productos/${imagenNombre}`;
  };

  /**
   * Resetea el formulario a sus valores iniciales
   * Se usa despues de crear o editar un producto, o al cancelar
   */
  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock: "",
      categoria: CATEGORIAS_PRODUCTOS[0],
    });
    setImagenFile(null);
    setImagenPreview(null);
    setProductoEditando(null);
  };

  // ==========================================================================
  // CREACION DE PRODUCTOS
  // ==========================================================================

  /**
   * Envia los datos del formulario al backend para crear un nuevo producto
   * Valida todos los campos antes de enviar
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones de campos obligatorios
    if (!formData.nombre.trim()) {
      setError("El nombre del producto es requerido");
      return;
    }
    
    const precio = parseFloat(formData.precio);
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un numero valido mayor a 0");
      return;
    }
    
    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un numero valido mayor o igual a 0");
      return;
    }
    
    if (!formData.descripcion.trim()) {
      setError("La descripcion del producto es requerida");
      return;
    }
    
    if (!formData.categoria) {
      setError("La categoria es requerida");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Construir FormData para enviar la imagen y los datos
      const formDataToSend = new FormData();
      formDataToSend.append("nombre", formData.nombre.trim());
      formDataToSend.append("descripcion", formData.descripcion.trim());
      formDataToSend.append("precio", precio.toString());
      formDataToSend.append("stock", stock.toString());
      formDataToSend.append("categoria", formData.categoria);
      
      if (imagenFile) {
        formDataToSend.append("imagen", imagenFile);
      }
      
      await crearProductoConImagen(formDataToSend);
      
      setSuccess("Producto creado exitosamente!");
      resetForm();
      
      // Recargar la lista completa desde el backend para asegurar consistencia
      await cargarProductos();
      
      setTimeout(() => {
        setShowNewProductForm(false);
        setSuccess("");
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      setError(error.response?.data?.detail || "Error al crear el producto");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // EDICION DE PRODUCTOS
  // ==========================================================================

  /**
   * Prepara el formulario para editar un producto existente
   * Carga los datos actuales del producto en el formulario
   */
  const handleEditarProducto = (producto: Producto) => {
    // Funcion auxiliar para obtener una categoria valida
    // Si la categoria del producto no existe en la lista, usa la primera por defecto
    const getCategoriaValida = (cat: string | undefined): string => {
      if (cat && CATEGORIAS_PRODUCTOS.includes(cat)) {
        return cat;
      }
      return CATEGORIAS_PRODUCTOS[0];
    };
    
    setProductoEditando(producto);
    setFormData({
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precio: producto.precio?.toString() || "0",
      stock: producto.stock?.toString() || "0",
      categoria: getCategoriaValida(producto.categoria),
    });
    setShowGestionProductos(true); // Mostrar panel de gestion para editar
  };

  /**
   * Envia los cambios de un producto editado al backend
   */
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoEditando) return;
    
    const precio = parseFloat(formData.precio);
    const stock = parseInt(formData.stock);
    
    // Validaciones
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un numero valido mayor a 0");
      return;
    }
    
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un numero valido mayor o igual a 0");
      return;
    }
    
    try {
      await actualizarProducto(productoEditando.id, {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio: precio,
        stock: stock,
        categoria: formData.categoria,
      });
      
      setSuccess("Producto actualizado exitosamente!");
      
      // Recargar la lista completa desde el backend para asegurar consistencia
      await cargarProductos();
      
      resetForm();
      setShowGestionProductos(false);
      
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al actualizar producto");
    }
  };

  // ==========================================================================
  // GESTION DE VISIBILIDAD Y ELIMINACION
  // ==========================================================================

  /**
   * Alterna la visibilidad de un producto (publicado/oculto)
   * Los productos ocultos no son visibles para los compradores
   */
  const handleToggleVisibilidad = async (producto: Producto) => {
    try {
      const result = await toggleProductoVisibilidad(producto.id);
      setSuccess(result.mensaje);
      await cargarProductos(); // Actualizar la lista para reflejar el cambio
      setTimeout(() => setSuccess(""), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Error al cambiar visibilidad");
    }
  };

  /**
   * Elimina un producto permanentemente de la base de datos
   * Muestra un mensaje de confirmacion antes de proceder
   */
  const handleEliminarProducto = async (producto: Producto) => {
    if (confirm(`¿Estas seguro de eliminar "${producto.nombre}"? Esta accion no se puede deshacer.`)) {
      try {
        await eliminarProducto(producto.id);
        setSuccess("Producto eliminado correctamente");
        await cargarProductos(); // Actualizar la lista despues de eliminar
        setTimeout(() => setSuccess(""), 2000);
      } catch (error: any) {
        setError(error.response?.data?.detail || "Error al eliminar producto");
      }
    }
  };

  // ==========================================================================
  // CALCULOS PARA ESTADISTICAS
  // ==========================================================================

  const totalProductos = productos.length;                    // Total de productos del vendedor
  const totalStock = productos.reduce((sum, p) => sum + (typeof p.stock === 'number' ? p.stock : 0), 0); // Suma total de existencias (convercion segura)
  const productosVisibles = productos.filter(p => p.activo === 1).length; // Productos visibles para compradores

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="vendedor-dashboard">
      
      {/* ======================================================================
           HEADER DEL VENDEDOR
           Muestra mensaje de bienvenida y estadisticas basicas
      ====================================================================== */}
      <div className="vendedor-header">
        <div className="vendedor-welcome">
          <h1>¡Hola, {user.apodo || user.nombre}!</h1>
          <p className="vendedor-subtitle">Panel de control de ventas y productos</p>
        </div>
        <div className="vendedor-stats">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{totalProductos}</h3>
              <p>Productos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{productosVisibles}</h3>
              <p>Visibles</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>0</h3>
              <p>Ventas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================
           ACCIONES RAPIDAS
           Botones principales para navegar entre las funciones del vendedor
      ====================================================================== */}
      <div className="acciones-rapidas">
        <button 
          className="btn-publicar"
          onClick={() => {
            setShowNewProductForm(!showNewProductForm);
            setShowGestionProductos(false);
            resetForm();
            setError("");
            setSuccess("");
          }}
        >
          {showNewProductForm ? "Cancelar" : "+ Nueva Publicación"}
        </button>
        <button 
          className="btn-gestionar"
          onClick={() => {
            setShowGestionProductos(!showGestionProductos);
            setShowNewProductForm(false);
            resetForm();
            setError("");
            setSuccess("");
          }}
        >
          Gestionar Productos
        </button>
        <button className="btn-ventas">Ver Ventas</button>
        
        {/* ====================================================================
             BOTON DE REFRESCAR
             Permite recargar manualmente la lista de productos.
             Util especialmente en movil donde no hay boton de recargar pagina.
        ====================================================================== */}
        <button 
          className="btn-refrescar"
          onClick={handleRefrescar}
          disabled={refrescando}
          title="Actualizar productos"
        >
          {refrescando ? "Actualizando..." : "⟳ Actualizar"}
        </button>
      </div>

      {/* ======================================================================
           FORMULARIO PARA CREAR NUEVO PRODUCTO
           Se muestra solo cuando showNewProductForm es true
      ====================================================================== */}
      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="form-grid">
              
              {/* Campo: Nombre del producto */}
              <div className="form-group">
                <label>Nombre del producto *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required disabled={isLoading} />
              </div>
              
              {/* Campo: Categoria (selector con opciones predefinidas) */}
              <div className="form-group">
                <label>Categoría *</label>
                <select 
                  name="categoria" 
                  value={formData.categoria} 
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="categoria-select"
                >
                  {CATEGORIAS_PRODUCTOS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <small className="categoria-help">Selecciona la categoría que mejor describa tu producto</small>
              </div>
              
              {/* Campo: Precio */}
              <div className="form-group">
                <label>Precio *</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} step="0.01" min="0" required disabled={isLoading} />
              </div>
              
              {/* Campo: Stock (cantidad disponible) */}
              <div className="form-group">
                <label>Stock *</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" step="1" required disabled={isLoading} />
              </div>
              
              {/* Campo: Descripcion (ocupa todo el ancho) */}
              <div className="form-group full-width">
                <label>Descripción *</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} required disabled={isLoading} />
              </div>
              
              {/* Campo: Imagen del producto */}
              <div className="form-group full-width">
                <label>Imagen del producto</label>
                <input type="file" accept="image/*" onChange={handleImagenChange} disabled={isLoading} />
                {imagenPreview && <img src={imagenPreview} alt="Preview" style={{ maxWidth: '200px', marginTop: '10px' }} />}
              </div>
            </div>
            
            {/* Botones de accion del formulario */}
            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => setShowNewProductForm(false)}>Cancelar</button>
              <button type="submit" className="btn-guardar" disabled={isLoading}>{isLoading ? "Publicando..." : "Publicar producto"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================
           PANEL DE GESTION DE PRODUCTOS
           Muestra todos los productos del vendedor con opciones de edicion
      ====================================================================== */}
      {showGestionProductos && (
        <div className="gestion-productos">
          <h2>Gestionar Productos</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {cargandoProductos ? (
            <div className="empty-state">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="empty-state">No tienes productos aún</div>
          ) : (
            <div className="productos-gestion-grid">
              {productos.map(producto => (
                <div key={producto.id} className={`producto-gestion-card ${producto.activo === 0 ? 'oculto' : ''}`}>
                  
                  {/* Imagen del producto */}
                  <div className="producto-gestion-imagen">
                    {producto.imagen_nombre ? (
                      <img src={getImagenUrl(producto.imagen_nombre) || ''} alt={producto.nombre} />
                    ) : <span>📷</span>}
                  </div>
                  
                  {/* Informacion del producto */}
                  <div className="producto-gestion-info">
                    <h3>{producto.nombre}</h3>
                    <p>Categoría: {producto.categoria || "Sin categoría"}</p>
                    <p>Precio: ${producto.precio}</p>
                    <p>Stock: {producto.stock}</p>
                    <p className={`estado ${producto.activo === 1 ? 'visible' : 'oculto'}`}>
                      {producto.activo === 1 ? 'Visible' : 'Oculto'}
                    </p>
                  </div>
                  
                  {/* Botones de accion para cada producto */}
                  <div className="producto-gestion-acciones">
                    <button className="btn-editar" onClick={() => handleEditarProducto(producto)}>Editar</button>
                    <button className="btn-toggle" onClick={() => handleToggleVisibilidad(producto)}>
                      {producto.activo === 1 ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button className="btn-eliminar" onClick={() => handleEliminarProducto(producto)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
           MODAL DE EDICION
           Ventana emergente para editar un producto
      ====================================================================== */}
      {productoEditando && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Producto</h3>
            <form onSubmit={handleGuardarEdicion}>
              
              {/* Campo: Nombre */}
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              </div>
              
              {/* Campo: Categoria */}
              <div className="form-group">
                <label>Categoría</label>
                <select name="categoria" value={formData.categoria} onChange={handleInputChange} required className="categoria-select">
                  {CATEGORIAS_PRODUCTOS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              {/* Campo: Precio */}
              <div className="form-group">
                <label>Precio</label>
                <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} step="0.01" required />
              </div>
              
              {/* Campo: Stock */}
              <div className="form-group">
                <label>Stock</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required />
              </div>
              
              {/* Campo: Descripcion */}
              <div className="form-group">
                <label>Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} required />
              </div>
              
              {/* Botones del modal */}
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => { setProductoEditando(null); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn-guardar">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendedorDashboard;