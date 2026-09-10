import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

interface Peticion {
  id: string;
  contenido: string;
  cliente_nombre: string;
  votos: number;
  estado: string;
  created_at: string;
  reproducida_en?: string;
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

  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [ultimaSeleccion, setUltimaSeleccion] = useState('');

  const [sistemaActivo, setSistemaActivo] = useState(true);
  const [colorCliente, setColorCliente] = useState('#FFFFFF');
  const [cargandoSistema, setCargandoSistema] = useState(true);

  // NUEVO: Referencia para mover la pantalla
  const formularioRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let colorGuardado = localStorage.getItem('dj_huella_color');
    
    if (!colorGuardado) {
      // 1. Elegimos un tono al azar entre 0 y 360 grados de color
      const h = Math.floor(Math.random() * 360);
      
      // 2. Función matemática para convertir ese tono en código Hexadecimal puro (#RRGGBB)
      // Manteniendo 100% de saturación y 50% de luz para que sea siempre un color brillante/neón
      const lNorm = 50 / 100;
      const a = (100 * Math.min(lNorm, 1 - lNorm)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      
      colorGuardado = `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
      localStorage.setItem('dj_huella_color', colorGuardado);
    }
    
    setColorCliente(colorGuardado);
  }, []);

  useEffect(() => {
    const cargarConfig = async () => {
      const { data } = await supabase.from('configuracion').select('sistema_activo').eq('id', 1).maybeSingle();
      if (data) setSistemaActivo(data.sistema_activo);
      setCargandoSistema(false);
    };
    cargarConfig();

    const canalConfig = supabase
      .channel('cambios-config')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion' }, (payload) => {
        setSistemaActivo(payload.new.sistema_activo);
      })
      .subscribe();

    return () => { supabase.removeChannel(canalConfig); };
  }, []);

  useEffect(() => {
    if (tipo !== 'cancion' || contenido.trim().length < 3 || contenido === ultimaSeleccion) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      try {
        const respuesta = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(contenido)}&entity=song&limit=10`);
        const datos = await respuesta.json();
        setSugerencias(datos.results || []);
        setMostrarSugerencias(true);
      } catch (error) {
        console.error("Error al buscar:", error);
      } finally {
        setBuscando(false);
      }
    }, 500);
    return () => clearTimeout(temporizador);
  }, [contenido, tipo, ultimaSeleccion]);

  useEffect(() => {
    cargarPeticiones();
    
    const canal = supabase
      .channel('cambios-peticiones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peticiones' }, () => {
        cargarPeticiones();
      })
      .subscribe();

    const manejarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        cargarPeticiones();
      }
    };
    document.addEventListener('visibilitychange', manejarVisibilidad);

    return () => { 
      supabase.removeChannel(canal); 
      document.removeEventListener('visibilitychange', manejarVisibilidad);
    };
  }, []);

  const cargarPeticiones = async () => {
    const { data, error } = await supabase
      .from('peticiones')
      .select('id, contenido, cliente_nombre, votos, estado, created_at, reproducida_en')
      .eq('tipo', 'cancion');

    if (!error && data) {
      const pendientes = data
        .filter(p => p.estado === 'pendiente')
        .sort((a, b) => {
          if (b.votos !== a.votos) return b.votos - a.votos;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      const ejecutadas = data
        .filter(p => p.estado === 'ejecutada')
        .sort((a, b) => {
          const tiempoA = a.reproducida_en ? new Date(a.reproducida_en).getTime() : new Date(a.created_at).getTime();
          const tiempoB = b.reproducida_en ? new Date(b.reproducida_en).getTime() : new Date(b.created_at).getTime();
          return tiempoB - tiempoA;
        });

      setPeticionesPendientes(pendientes);
      setPeticionesEjecutadas(ejecutadas);
    }
  };

  const enviarPeticion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenido) return;
    setEnviando(true);

    const { error } = await supabase
      .from('peticiones')
      .insert([{ 
        tipo, 
        cliente_nombre: nombre || 'Anónimo', 
        mesa: mesa || 'Barra', 
        contenido, 
        estado: 'pendiente', 
        votos: 1,
        color_cliente: colorCliente 
      }]);

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

  if (cargandoSistema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#100B21]">
        <div className="text-neon-blue font-bold animate-pulse">Conectando con cabina...</div>
      </div>
    );
  }

  if (!sistemaActivo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#100B21] text-center relative overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-64 h-64 bg-neon-purple rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none"></div>
        <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <span className="text-7xl mb-6 block animate-bounce">🎧</span>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple mb-4">
            CABINA CERRADA
          </h1>
          <p className="text-gray-300 text-lg">
            El DJ está preparando su set o tomando un respiro.
          </p>
          <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/5">
            <p className="text-neon-blue font-bold animate-pulse">
              Las complacencias se activarán en breve...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 pt-4 relative overflow-hidden pb-20">
      
      <div className="fixed top-[-10%] left-[-10%] w-64 h-64 bg-neon-purple rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-64 h-64 bg-neon-blue rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="z-10 text-center mb-4">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple mb-1 drop-shadow-[0_0_15px_rgba(188,19,254,0.5)]">
          DJ HAROLD
        </h1>
        <p className="text-gray-300 font-light tracking-widest uppercase text-sm">Viernes de Complacencias</p>
      </div>

      <div className="z-50 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl mb-6 overflow-visible">
        {/* NUEVO: Ref agregado al formulario */}
        <form ref={formularioRef} onSubmit={enviarPeticion} className="flex flex-col gap-3 relative">
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="Tu Nombre (Opcional)" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              // NUEVO: Correctores desactivados
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-neon-purple transition-colors"
            />
            <input 
              type="text" 
              placeholder="# Mesa" 
              value={mesa} 
              onChange={(e) => setMesa(e.target.value)} 
              className="w-24 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white text-center focus:border-neon-purple transition-colors"
            />
          </div>

          <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
            <button type="button" onClick={() => { setTipo('cancion'); setMostrarSugerencias(false); }} className={`flex-1 py-1.5 rounded-full text-sm font-bold transition-all ${tipo === 'cancion' ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.4)]' : 'text-gray-400 hover:text-white'}`}>🎵 Canción</button>
            <button type="button" onClick={() => { setTipo('saludo'); setMostrarSugerencias(false); }} className={`flex-1 py-1.5 rounded-full text-sm font-bold transition-all ${tipo === 'saludo' ? 'bg-neon-blue text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-gray-400 hover:text-white'}`}>👋 Saludo</button>
          </div>

          <div className="relative w-full">
            <textarea 
              required 
              placeholder={tipo === 'cancion' ? "¿Qué canción quieres escuchar? Ej. Bee Gees - Night Fever" : "¿Qué mensaje quieres enviar?"} 
              value={contenido} 
              onChange={(e) => { setContenido(e.target.value); if (e.target.value !== ultimaSeleccion) setUltimaSeleccion(''); }} 
              // NUEVO: Movimiento mágico de pantalla y correctores desactivados
              onFocus={() => {
                setTimeout(() => {
                  formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 400);
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-neon-blue transition-colors h-16 resize-none relative z-10"
            />
            
            {tipo === 'cancion' && mostrarSugerencias && (sugerencias.length > 0 || buscando) && (
              <div className="absolute top-full mt-2 w-full bg-[#100B21] border border-neon-purple/50 rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.2)] z-50 overflow-hidden">
                {buscando ? (
                  <div className="p-4 text-center text-neon-blue text-sm animate-pulse font-medium">Buscando en la base musical...</div>
                ) : (
                  <ul className="flex flex-col max-h-[300px] overflow-y-auto relative">
                    {sugerencias.map((item, index) => (
                      <li key={index} onClick={() => seleccionarSugerencia(item.artistName, item.trackName)} className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors flex flex-col">
                        <span className="text-white font-bold">{item.trackName}</span>
                        <span className="text-neon-blue text-xs mt-1">{item.artistName}</span>
                      </li>
                    ))}
                    <li onClick={() => setMostrarSugerencias(false)} className="px-4 py-3 bg-[#100B21] hover:bg-white/10 cursor-pointer transition-colors flex justify-center items-center text-gray-400 hover:text-white text-sm font-bold sticky bottom-0 border-t border-white/10">Usar mi texto (Ocultar) ⬆️</li>
                  </ul>
                )}
              </div>
            )}
          </div>
          
          <button type="submit" disabled={enviando} className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-black text-lg shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:scale-[1.02] transition-all relative z-0">
            {enviando ? 'Enviando...' : 'ENVIAR AL DJ 🚀'}
          </button>
        </form>
        {mensajeExito && <div className="mt-4 p-2 bg-neon-green/20 border border-neon-green rounded-xl text-neon-green text-center font-bold animate-pulse relative z-0">¡Recibido en cabina!</div>}
      </div>

      {peticionesEjecutadas.length > 0 && (
        <div className="z-10 w-full max-w-md mb-6">
          <div className="bg-gradient-to-r from-neon-green/20 to-black border border-neon-green rounded-2xl p-4 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
            <p className="text-neon-green font-bold text-sm uppercase tracking-widest mb-1 animate-pulse">🎶 Sonando Ahora / Reciente</p>
            <p className="text-white font-bold text-lg">{peticionesEjecutadas[0].contenido}</p>
            <p className="text-gray-400 text-xs">Dedicada por: {peticionesEjecutadas[0].cliente_nombre}</p>
          </div>
        </div>
      )}

      {peticionesPendientes.length > 0 && (
        <div className="z-10 w-full max-w-md mb-6">
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">🔥 Próximamente</h2>
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

      {peticionesEjecutadas.length > 1 && (
        <div className="z-10 w-full max-w-md">
          <h2 className="text-lg font-bold text-gray-400 mb-3 flex items-center gap-2">✅ Ya Sonaron</h2>
          <div className="flex flex-col gap-3 opacity-80 max-h-[250px] overflow-y-auto pr-2">
            {peticionesEjecutadas.slice(1).map((peticion) => (
              <div key={peticion.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors shrink-0">
                <span className="text-gray-500 text-xl drop-shadow-md">✔️</span>
                <div>
                  <p className="text-gray-300 font-medium leading-tight">{peticion.contenido}</p>
                  <p className="text-gray-500 text-xs mt-1">Dedicada por: {peticion.cliente_nombre}</p>
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