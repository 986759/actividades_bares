import { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface Peticion {
  id: string;
  contenido: string;
  cliente_nombre: string;
  votos: number;
  estado: string;
}

function App() {
  const [tipo, setTipo] = useState<'cancion' | 'saludo'>('cancion');
  const [nombre, setNombre] = useState('');
  const [mesa, setMesa] = useState('');
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  
  const [peticionesPendientes, setPeticionesPendientes] = useState<Peticion[]>([]);
  const [peticionesEjecutadas, setPeticionesEjecutadas] = useState<Peticion[]>([]);

  // Estados para el buscador inteligente de iTunes
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  // Estado para recordar qué fue lo último que seleccionó el cliente
  const [ultimaSeleccion, setUltimaSeleccion] = useState('');

  // Efecto que consulta a iTunes cuando el cliente escribe
  useEffect(() => {
    if (tipo !== 'cancion' || contenido.trim().length < 3 || contenido === ultimaSeleccion) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    const temporizador = setTimeout(async () => {
      setBuscando(true);
      try {
        const respuesta = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(contenido)}&entity=song&limit=20`);
        const datos = await respuesta.json();
        setSugerencias(datos.results || []);
        setMostrarSugerencias(true);
      } catch (error) {
        console.error("Error al buscar música:", error);
      } finally {
        setBuscando(false);
      }
    }, 500);

    return () => clearTimeout(temporizador);
  }, [contenido, tipo, ultimaSeleccion]);

  // Cargar historial y escuchar tiempo real de Supabase
  useEffect(() => {
    cargarPeticiones();
    const canal = supabase
      .channel('cambios-peticiones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peticiones' }, () => {
        cargarPeticiones();
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const cargarPeticiones = async () => {
    const { data, error } = await supabase
      .from('peticiones')
      .select('id, contenido, cliente_nombre, votos, estado')
      .eq('tipo', 'cancion')
      .order('votos', { ascending: false });

    if (!error && data) {
      setPeticionesPendientes(data.filter(p => p.estado === 'pendiente'));
      setPeticionesEjecutadas(data.filter(p => p.estado === 'ejecutada').reverse());
    }
  };

  const enviarPeticion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenido) return;
    setEnviando(true);

    const { error } = await supabase
      .from('peticiones')
      .insert([{ tipo, cliente_nombre: nombre || 'Anónimo', mesa: mesa || 'Barra', contenido, estado: 'pendiente', votos: 1 }]);

    setEnviando(false);
    if (!error) {
      setMensajeExito(true);
      setContenido('');
      setUltimaSeleccion(''); 
      setMostrarSugerencias(false); 
      setTimeout(() => setMensajeExito(false), 4000);
    }
  };

  const votarCancion = async (id: string, votosActuales: number) => {
    await supabase.from('peticiones').update({ votos: votosActuales + 1 }).eq('id', id);
  };

  const seleccionarSugerencia = (artista: string, cancion: string) => {
    const seleccion = `${artista} - ${cancion}`;
    setContenido(seleccion);
    setUltimaSeleccion(seleccion);
    setSugerencias([]);
    setMostrarSugerencias(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 pt-12 relative overflow-hidden pb-20">
      
      {/* Fondo decorativo */}
      <div className="fixed top-[-10%] left-[-10%] w-64 h-64 bg-neon-purple rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-64 h-64 bg-neon-blue rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none"></div>

      {/* Cabecera */}
      <div className="z-10 text-center mb-8">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple mb-2 drop-shadow-[0_0_15px_rgba(188,19,254,0.5)]">
          DJ HAROLD
        </h1>
        <p className="text-gray-300 font-light tracking-widest uppercase text-sm">Viernes de Complacencias</p>
      </div>

      {/* Formulario Glassmorphism */}
      <div className="z-50 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl mb-8 overflow-visible">
        <form onSubmit={enviarPeticion} className="flex flex-col gap-5 relative">
          <div className="flex gap-4">
            <input type="text" placeholder="Tu Nombre (Opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-purple transition-colors"/>
            <input type="text" placeholder="# Mesa" value={mesa} onChange={(e) => setMesa(e.target.value)} className="w-24 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:border-neon-purple transition-colors"/>
          </div>

          <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
            <button 
              type="button"
              onClick={() => { setTipo('cancion'); setMostrarSugerencias(false); }}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tipo === 'cancion' ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.4)]' : 'text-gray-400 hover:text-white'}`}
            >
              🎵 Canción
            </button>
            <button 
              type="button"
              onClick={() => { setTipo('saludo'); setMostrarSugerencias(false); }}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition-all ${tipo === 'saludo' ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-gray-400 hover:text-white'}`}
            >
              👋 Saludo
            </button>
          </div>

          <div className="relative w-full">
            <textarea 
              required 
              placeholder={tipo === 'cancion' ? "¿Qué canción quieres escuchar? Ej. Bee Gees - Night Fever" : "¿Qué mensaje quieres enviar?"} 
              value={contenido} 
              onChange={(e) => {
                setContenido(e.target.value);
                if (e.target.value !== ultimaSeleccion) {
                  setUltimaSeleccion('');
                }
              }} 
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-blue transition-colors h-28 resize-none relative z-10"
            />
            
            {/* Lista Flotante de Sugerencias de iTunes con botón de Ocultar */}
            {tipo === 'cancion' && mostrarSugerencias && (sugerencias.length > 0 || buscando) && (
              <div className="absolute top-full mt-2 w-full bg-[#100B21] border border-neon-purple/50 rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.2)] z-50 overflow-hidden">
                {buscando ? (
                  <div className="p-4 text-center text-neon-blue text-sm animate-pulse font-medium">
                    Buscando en la base musical...
                  </div>
                ) : (
                  <ul className="flex flex-col max-h-[300px] overflow-y-auto relative">
                    {sugerencias.map((item, index) => (
                      <li 
                        key={index}
                        onClick={() => seleccionarSugerencia(item.artistName, item.trackName)}
                        className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors flex flex-col"
                      >
                        <span className="text-white font-bold">{item.trackName}</span>
                        <span className="text-neon-blue text-xs mt-1">{item.artistName}</span>
                      </li>
                    ))}
                    {/* Botón para cerrar sugerencias */}
                    <li 
                      onClick={() => setMostrarSugerencias(false)}
                      className="px-4 py-3 bg-[#100B21] hover:bg-white/10 cursor-pointer transition-colors flex justify-center items-center text-gray-400 hover:text-white text-sm font-bold sticky bottom-0 border-t border-white/10"
                    >
                      Usar mi texto (Ocultar) ⬆️
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <button type="submit" disabled={enviando} className="mt-2 w-full py-4 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-black text-lg shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:scale-[1.02] transition-all relative z-0">
            {enviando ? 'Enviando...' : 'ENVIAR AL DJ 🚀'}
          </button>
        </form>
        {mensajeExito && <div className="mt-6 p-3 bg-neon-green/20 border border-neon-green rounded-xl text-neon-green text-center font-bold animate-pulse relative z-0">¡Recibido en cabina!</div>}
      </div>

      {/* Tarjeta de Sonando Ahora */}
      {peticionesEjecutadas.length > 0 && (
        <div className="z-10 w-full max-w-md mb-8">
          <div className="bg-gradient-to-r from-neon-green/20 to-black border border-neon-green rounded-2xl p-4 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
            <p className="text-neon-green font-bold text-sm uppercase tracking-widest mb-1 animate-pulse">🎶 Sonando Ahora / Reciente</p>
            <p className="text-white font-bold text-lg">{peticionesEjecutadas[0].contenido}</p>
            <p className="text-gray-400 text-xs">Dedicada por: {peticionesEjecutadas[0].cliente_nombre}</p>
          </div>
        </div>
      )}

      {/* Lista de Pendientes */}
      {peticionesPendientes.length > 0 && (
        <div className="z-10 w-full max-w-md mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🔥 Próximamente</h2>
          <div className="flex flex-col gap-3">
            {peticionesPendientes.map((peticion) => (
              <div key={peticion.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <p className="text-white font-medium">{peticion.contenido}</p>
                  <p className="text-gray-400 text-xs mt-1">De: {peticion.cliente_nombre}</p>
                </div>
                <button onClick={() => votarCancion(peticion.id, peticion.votos)} className="flex flex-col items-center justify-center bg-black/40 hover:bg-neon-purple/20 border border-white/10 rounded-xl h-14 w-14 group transition-colors">
                  <span className="text-lg group-hover:scale-125 transition-transform">🔥</span>
                  <span className="text-neon-purple font-bold text-xs">{peticion.votos}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de canciones previas rediseñado */}
      {peticionesEjecutadas.length > 1 && (
        <div className="z-10 w-full max-w-md">
          <h2 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">✅ Ya Sonaron</h2>
          <div className="flex flex-col gap-3 opacity-80">
            {peticionesEjecutadas.slice(1).map((peticion) => (
              <div key={peticion.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <span className="text-gray-500 text-xl drop-shadow-md">✔️</span>
                <div>
                  <p className="text-gray-300 font-medium leading-tight">{peticion.contenido}</p>
                  <p className="text-gray-500 text-xs mt-1">Dedicada por: {peticionesEjecutadas[0].cliente_nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;