import React, { useState, useEffect } from "react";
import { listarTodosProductos, type Producto, agregarFavorito, quitarFavorito, obtenerFavoritos } from "../services/products";
import { type Usuario } from "../services/users";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

interface CompradorDashboardProps {
  user: Usuario;
  terminoBusqueda?: string; // Recibe el termino de busqueda desde el padre
}

const CompradorDashboard: React.FC<CompradorDashboardProps> = ({ user, terminoBusqueda = "" }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todos");
  const [categorias, setCategorias] = useState<string[]>(["todos"]);
  const [busquedaLocal, setBusquedaLocal] = useState<string>(terminoBusqueda);

  // Actualizar busqueda local cuando cambia la prop
  useEffect(() => {
    setBusquedaLocal(terminoBusqueda);
  }, [terminoBusqueda]);

  const cargarProductos = async () => {
    try {
      setCargando(true);
      const data = await listarTodosProductos();
      setProductos(data);
      const categoriasUnicas = ["todos", ...new Set(data.map(p => p.categoria).filter(Boolean))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    } finally {
      setCargando(false);
    }
  };

  const cargarFavoritos = async () => {
    try {
      const favoritosData = await obtenerFavoritos();
      const favoritosSet = new Set(favoritosData.map((f: any) => f.producto_id));
      setFavoritos(favoritosSet);
    } catch (error) {
      console.error("Error al cargar favoritos:", error);
    }
  };

  useEffect(() => {
    cargarProductos();
    cargarFavoritos();
  }, []);

  const handleFavorito = async (productoId: number) => {
    try {
      if (favoritos.has(productoId)) {
        const result = await quitarFavorito(productoId);
        console.log(result.mensaje);
        setFavoritos(prev => {
          const nuevo = new Set(prev);
          nuevo.delete(productoId);
          return nuevo;
        });
      } else {
        const result = await agregarFavorito(productoId);
        console.log(result.mensaje);
        setFavoritos(prev => new Set(prev).add(productoId));
      }
    } catch (error) {
      console.error("Error al gestionar favorito:", error);
      alert("No se pudo actualizar favoritos. Intenta de nuevo.");
    }
  };

  const getImagenUrl = (imagenNombre: string | null): string | null => {
    if (!imagenNombre) return null;
    return `${API_URL}/uploads/productos/${imagenNombre}`;
  };

  const getVendedorNombre = (producto: Producto): string => {
    if (producto.vendedor) {
      return producto.vendedor.apodo || producto.vendedor.nombre;
    }
    return "Vendedor";
  };

  // Filtrar productos por categoria y por termino de busqueda
  const productosFiltrados = productos.filter(producto => {
    // Filtro por categoria
    if (categoriaSeleccionada !== "todos" && producto.categoria !== categoriaSeleccionada) {
      return false;
    }
    
    // Filtro por termino de busqueda (nombre del producto o nombre del vendedor)
    if (busquedaLocal.trim() !== "") {
      const busqueda = busquedaLocal.toLowerCase().trim();
      const coincideNombre = producto.nombre.toLowerCase().includes(busqueda);
      const coincideVendedor = getVendedorNombre(producto).toLowerCase().includes(busqueda);
      return coincideNombre || coincideVendedor;
    }
    
    return true;
  });

  const displayName = user.apodo || user.nombre;

  return (
    <div className="comprador-dashboard">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">¡Bienvenido, {displayName}!</h1>
            <p className="hero-description">
              Explora los mejores productos de ToroEats
            </p>
          </div>
          <div className="hero-image">
            <img
              src="/ToroEats-removebg-preview.png"
              alt="ToroEats Logo"
              className="main-logo-image"
              onError={(e) => {
                e.currentTarget.src = "/ToroEats.jpeg";
              }}
            />
          </div>
        </div>
      </div>

      {/* Categorias */}
      {productos.length > 0 && (
        <div className="categorias-section">
          <h2 className="section-title">Categorias</h2>
          <div className="categorias-grid">
            {categorias.map(cat => (
              <button
                key={cat}
                className={`categoria-btn ${categoriaSeleccionada === cat ? "active" : ""}`}
                onClick={() => setCategoriaSeleccionada(cat)}
              >
                {cat === "todos" ? "Todos" : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="productos-section">
        <h2 className="section-title">
          {busquedaLocal 
            ? `Resultados para "${busquedaLocal}"` 
            : (categoriaSeleccionada === "todos" ? "Productos Disponibles" : categoriaSeleccionada)}
        </h2>
        
        {cargando ? (
          <div className="empty-state">Cargando productos...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="empty-state">
            {busquedaLocal 
              ? `No se encontraron productos que coincidan con "${busquedaLocal}"` 
              : (categoriaSeleccionada === "todos" 
                ? "No hay productos disponibles aun" 
                : `No hay productos en la categoria "${categoriaSeleccionada}"`)}
          </div>
        ) : (
          <div className="productos-grid">
            {productosFiltrados.map(producto => (
              <div key={producto.id} className="producto-card">
                <div className="producto-imagen">
                  {producto.imagen_nombre ? (
                    <img 
                      src={getImagenUrl(producto.imagen_nombre) || ''} 
                      alt={producto.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="no-image-icon">a</span>
                  )}
                  <button
                    className={`favorito-btn ${favoritos.has(producto.id) ? "active" : ""}`}
                    onClick={() => handleFavorito(producto.id)}
                  >
                    {favoritos.has(producto.id) ? "❤️" : "🤍"}
                  </button>
                </div>
                <div className="producto-info">
                  <h3>{producto.nombre}</h3>
                  
                  <div className="producto-detalle-linea">
                    <span className="detalle-etiqueta">Categoria:</span>
                    <span className="detalle-valor">{producto.categoria}</span>
                  </div>
                  
                  <div className="producto-detalle-linea">
                    <span className="detalle-etiqueta">Vendedor:</span>
                    <span className="detalle-valor vendedor-nombre">{getVendedorNombre(producto)}</span>
                  </div>
                  
                  <div className="producto-descripcion-container">
                    <span className="detalle-etiqueta">Descripcion:</span>
                    <p className="producto-descripcion">{producto.descripcion}</p>
                  </div>
                  
                  <div className="producto-detalles">
                    <div className="producto-precio">
                      <span className="detalle-etiqueta">Precio:</span>
                      <span className="precio-valor">${producto.precio}</span>
                    </div>
                    <div className="producto-stock">
                      <span className="detalle-etiqueta">Stock:</span>
                      <span className="stock-valor">{producto.stock} unidades</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sellers-section">
        <h2 className="section-title">Vendedores Destacados</h2>
        <div className="empty-state">
          <p>Proximamente</p>
        </div>
      </div>
    </div>
  );
};

export default CompradorDashboard;