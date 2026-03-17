import React, { useState, useEffect, useCallback } from "react";
import { crearProducto, listarProductosPorVendedor, type ProductoCreate, type Producto } from "../services/products";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

interface VendedorDashboardProps {
  user: Usuario;
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user }) => {
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
  });

  // Función para cargar productos
  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const data = await listarProductosPorVendedor(user.id);
      console.log("Productos cargados:", data);
      setProductos(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError("No se pudieron cargar los productos");
    } finally {
      setCargandoProductos(false);
    }
  }, [user.id]);

  // Cargar productos al montar el componente
  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError("El nombre del producto es requerido");
      return;
    }
    
    const precio = parseFloat(formData.precio);
    if (isNaN(precio) || precio <= 0) {
      setError("El precio debe ser un número válido mayor a 0");
      return;
    }
    
    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      setError("El stock debe ser un número válido mayor o igual a 0");
      return;
    }
    
    if (!formData.descripcion.trim()) {
      setError("La descripción del producto es requerida");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const nuevoProducto: ProductoCreate = {
        vendedor_id: user.id,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        precio: precio,
        stock: stock,
      };
      
      console.log("Enviando producto:", nuevoProducto);
      
      const productoCreado = await crearProducto(nuevoProducto);
      console.log("Producto creado:", productoCreado);
      
      // ===== ACTUALIZACIÓN ÚNICA =====
      // Crear un NUEVO array con todos los productos actualizados
      const nuevosProductos = [...productos, productoCreado];
      
      // Actualizar el estado UNA SOLA VEZ
      setProductos(nuevosProductos);
      
      // Mostrar éxito
      setSuccess(true);
      
      // Limpiar formulario
      setFormData({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
      });
      
      // Cerrar formulario después de 2 segundos
      setTimeout(() => {
        setShowNewProductForm(false);
        setSuccess(false);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      
      if (error.response) {
        setError(error.response.data?.detail || `Error ${error.response.status}`);
      } else if (error.request) {
        setError("No se pudo conectar con el servidor");
      } else {
        setError(error.message || "Error al crear el producto");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular estadísticas (se recalcula en CADA render)
  const totalProductos = productos.length;
  const totalStock = productos.reduce((sum, p) => sum + p.stock, 0);

  console.log("Render - totalProductos:", totalProductos, "productos:", productos);

  return (
    <div className="vendedor-dashboard">
      <div className="vendedor-header">
        <div className="vendedor-welcome">
          <h1>¡Hola, {user.nombre}!</h1>
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
              <h3>{totalStock}</h3>
              <p>Total de existencias</p>
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

      <div className="acciones-rapidas">
        <button 
          className="btn-publicar"
          onClick={() => {
            setShowNewProductForm(!showNewProductForm);
            setError("");
            setSuccess(false);
          }}
        >
          {showNewProductForm ? "Cancelar" : "Nueva Publicación"}
        </button>
        <button className="btn-gestionar">Gestionar Productos</button>
        <button className="btn-ventas">Ver Ventas</button>
      </div>

      {showNewProductForm && (
        <div className="nuevo-producto-form">
          <h2>Crear nueva publicación</h2>
          
          {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}
          {success && <div className="success-message" style={{ marginBottom: '15px' }}>¡Producto creado exitosamente!</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del producto *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej. Pastel de chocolate"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label>Precio *</label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label>Stock *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="Cantidad disponible"
                  min="0"
                  step="1"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group full-width">
                <label>Descripción *</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe tu producto..."
                  rows={4}
                  required
                  disabled={isLoading}
                ></textarea>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancelar" 
                onClick={() => setShowNewProductForm(false)}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-guardar"
                disabled={isLoading}
              >
                {isLoading ? "Publicando..." : "Publicar producto"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="vendedor-contenido" style={{ marginTop: '30px' }}>
        <div className="seccion-productos">
          <div className="seccion-header">
            <h2>Mis productos ({totalProductos})</h2>
          </div>
          
          {cargandoProductos ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Cargando productos...
            </div>
          ) : productos.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No has publicado productos aún
            </div> 
          ) : (
            <div className="productos-grid">
              {productos.map(producto => (
                <div key={producto.id} className="producto-card">
                  <div className="producto-info">
                    <h3>{producto.nombre}</h3>
                    <p className="producto-descripcion">{producto.descripcion}</p>
                    <div className="producto-detalles">
                      <span className="producto-precio">${producto.precio}</span>
                      <span className="producto-stock">Stock: {producto.stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="seccion-ventas" style={{ marginTop: '20px' }}>
          <div className="seccion-header">
            <h2>Ventas recientes</h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No hay ventas recientes
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;