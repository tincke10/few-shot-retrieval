// Demo data, used when the backend isn't reachable so the UI still looks alive.
// Mirrors the fallback in scrivo.html.

export function mockProfiles() {
  return [
    { id: 'tecnico', name: 'Técnico', description: 'Documentación precisa, voz neutra y foco en la exactitud.', examplesCount: 142 },
    { id: 'marketing', name: 'Marketing', description: 'Persuasivo y enérgico, orientado a la conversión.', examplesCount: 98 },
    { id: 'narrativo', name: 'Narrativo', description: 'Storytelling envolvente, con ritmo y emoción.', examplesCount: 76 },
    { id: 'legal', name: 'Formal / Legal', description: 'Lenguaje formal, estructurado y cauteloso.', examplesCount: 54 },
  ];
}

const POOLS = {
  tecnico: [
    { source: 'docs/api-reference.md', text: 'El endpoint acepta un cuerpo JSON con los campos requeridos; cualquier parámetro adicional se ignora para mantener compatibilidad hacia atrás.' },
    { source: 'guides/deployment.md', text: 'Antes de promover a producción, validá las variables de entorno y ejecutá la suite de smoke tests contra staging.' },
    { source: 'changelog/v2.4.md', text: 'Se corrige una condición de carrera en el pool de conexiones que derivaba en timeouts intermitentes bajo alta concurrencia.' },
    { source: 'docs/auth.md', text: 'Los tokens expiran a los 3600 segundos; implementá refresh anticipado para evitar cortes de sesión en operaciones largas.' },
  ],
  marketing: [
    { source: 'campañas/q3-launch.md', text: 'No es una actualización más: es el salto que tu equipo venía esperando. Menos fricción, más resultados, desde el día uno.' },
    { source: 'landing/hero-variants.md', text: 'Convertí visitantes en clientes con una propuesta que se entiende en cinco segundos y se siente imposible de ignorar.' },
    { source: 'emails/nurture-3.md', text: 'Sabemos que el tiempo te corre. Por eso lo hicimos simple: activás, configurás y ya estás generando valor.' },
    { source: 'social/launch-thread.md', text: 'Spoiler: tus métricas no van a volver a ser las mismas. Y esto es apenas el principio.' },
  ],
  narrativo: [
    { source: 'relatos/origen.md', text: 'Todo empezó con una pregunta incómoda, de esas que se quedan dando vueltas hasta que no queda más remedio que responderlas.' },
    { source: 'blog/historia-cliente.md', text: 'Marta no buscaba revolucionar nada. Solo quería que el lunes a la mañana dejara de pesar tanto. Y entonces algo cambió.' },
    { source: 'guion/spot-30s.md', text: 'Hay momentos que no se planean: se reconocen. Este es uno de esos, y vos estás justo en el medio.' },
    { source: 'newsletter/05.md', text: 'Te lo cuento como me lo contaron a mí: bajito, casi al oído, porque las mejores ideas nunca llegan gritando.' },
  ],
  legal: [
    { source: 'contratos/marco-servicios.md', text: 'Las Partes acuerdan que toda modificación al presente deberá constar por escrito y ser suscripta por representantes autorizados.' },
    { source: 'politicas/privacidad.md', text: 'El Responsable tratará los datos personales con la finalidad exclusiva indicada, conservándolos por el plazo legalmente exigible.' },
    { source: 'tos/v3.md', text: 'El Usuario reconoce y acepta que el uso del Servicio se rige por los términos aquí dispuestos, sin reserva alguna.' },
    { source: 'compliance/nda.md', text: 'La información confidencial no podrá divulgarse a terceros sin el consentimiento previo y expreso de la Parte Reveladora.' },
  ],
};

export function mockRetrieved(id, k) {
  const pool = POOLS[id] || POOLS.tecnico;
  const out = [];
  for (let i = 0; i < k; i++) {
    const b = pool[i % pool.length];
    out.push({ source: b.source, text: b.text, score: Math.max(0.41, 0.94 - i * 0.075 - Math.random() * 0.025) });
  }
  return out;
}

export function mockOutput(id, prompt) {
  const snippet = (prompt || '').trim().replace(/\s+/g, ' ').slice(0, 70);
  const tail = (prompt || '').trim().length > 70 ? '…' : '';
  const map = {
    tecnico: `Resumen\n\nLa funcionalidad descrita se implementa siguiendo el patrón establecido en el resto del sistema: la entrada se valida, los parámetros se normalizan y el procesamiento se delega a la capa correspondiente, devolviendo una respuesta tipada y predecible.\n\nConsideraciones clave\n• Manejar los casos de borde de forma explícita.\n• Registrar métricas de latencia y tasa de error por endpoint.\n• Exponer fallos con un código y un mensaje accionables.`,
    marketing: `Imaginá resolver "${snippet}${tail}" sin esfuerzo. Eso es exactamente lo que esto hace —y lo hace en serio.\n\nNada de promesas vacías ni pasos de más. Una sola activación y tu equipo empieza a moverse más rápido.\n\nProbalo hoy. Mañana no vas a entender cómo trabajabas sin esto.`,
    narrativo: `Todo empezó con "${snippet}${tail}". Una idea pequeña, casi tímida, de esas que uno deja para después.\n\nPero las ideas pequeñas tienen una manía: crecen cuando nadie las mira. Y esta creció.\n\nLo que sigue no lo planeamos. Simplemente, un día, estaba ahí.`,
    legal: `CLÁUSULA PRIMERA — Objeto\n\nEl presente instrumento tiene por objeto regular los términos relativos a "${snippet}${tail}", conforme a la voluntad de las Partes.\n\nCLÁUSULA SEGUNDA — Vigencia\n\nLo aquí dispuesto entrará en vigor a partir de su suscripción.`,
  };
  return map[id] || map.tecnico;
}
