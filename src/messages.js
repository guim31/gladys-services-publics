// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". Names of services and places never translate.
//
// French texts say "ouvert"/"fermé" after a colon, never as an adjective of
// the service: "Mairie - Toulouse : ouvert", whatever the gender of its name.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names, frozen when the device is created (configured language).
export const NAMES = {
  en: {
    open: 'Open now',
    hours: "Today's hours",
    next: 'Next opening',
    comment: 'Comment',
    wait: 'Waiting time',
    liveOpen: 'Open (real time)',
  },
  fr: {
    open: 'Ouvert maintenant',
    hours: 'Horaires du jour',
    next: 'Prochaine ouverture',
    comment: 'Commentaire',
    wait: "Temps d'attente",
    liveOpen: 'Ouvert (temps réel)',
  },
  de: {
    open: 'Jetzt geöffnet',
    hours: 'Heutige Öffnungszeiten',
    next: 'Nächste Öffnung',
    comment: 'Hinweis',
    wait: 'Wartezeit',
    liveOpen: 'Geöffnet (Echtzeit)',
  },
  es: {
    open: 'Abierto ahora',
    hours: 'Horario de hoy',
    next: 'Próxima apertura',
    comment: 'Comentario',
    wait: 'Tiempo de espera',
    liveOpen: 'Abierto (tiempo real)',
  },
};

// Day names, Monday first.
export const WEEKDAYS = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
};
export const SHORT_WEEKDAYS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  fr: ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'],
  de: ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.'],
  es: ['lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.'],
};

// Feature states, widget rows and scene sentences. `when` is a text built by
// src/service.js ("demain à 08:30"), `short` its widget form ("lun. 08:30").
export const TEXT = {
  en: {
    closedToday: 'Closed today',
    holidayClosed: 'Public holiday: assumed closed',
    holiday: 'public holiday',
    noHours: 'No hours in the directory',
    hoursInComment: 'Hours given in the comment',
    allDay: 'open 24/7',
    noComment: 'No comment',
    noNext: 'none in the next 14 days',
    unknown: 'unknown',
    today: ({ time }) => `today at ${time}`,
    tomorrow: ({ time }) => `tomorrow at ${time}`,
    weekday: ({ day, time }) => `${day} at ${time}`,
    date: ({ date, time }) => `on ${date} at ${time}`,
    open: 'open',
    closed: 'closed',
    openUntil: ({ time }) => `open until ${time}`,
    closesIn: ({ minutes }) => `closes in ${minutes} min`,
    opensAt: ({ short }) => `closed · opens ${short}`,
    holidayRow: ({ short }) => `holiday · opens ${short}`,
    sentenceOpen: ({ name, time }) => `${name}: open until ${time}.`,
    sentenceAlways: ({ name }) => `${name}: open 24/7.`,
    sentenceClosed: ({ name, when }) => `${name}: closed, opens ${when}.`,
    sentenceHoliday: ({ name, when }) =>
      `${name}: public holiday, assumed closed (the directory does not say), opens ${when}.`,
    sentenceNoNext: ({ name }) => `${name}: closed, no opening in the next 14 days.`,
    sentenceUnknown: ({ name }) => `${name}: no hours in the directory.`,
    pickService: 'Add a service in the Discover tab of the integration, then pick it here.',
    gone: 'This service is no longer watched.',
    noService: 'No service is watched: add one in the Discover tab of the integration.',
    waitRow: ({ minutes }) => `open · ${minutes} min wait`,
    noLive: 'no live data',
    sentenceWait: ({ name, minutes }) => `${name}: open, ${minutes} min wait.`,
    sentenceWaitOpen: ({ name }) => `${name}: open, waiting time not given.`,
    sentenceWaitClosed: ({ name }) => `${name}: closed (real time).`,
    sentenceWaitUnknown: ({ name }) => `${name}: no real-time data.`,
  },
  fr: {
    closedToday: "Fermé aujourd'hui",
    holidayClosed: 'Jour férié : fermé a priori',
    holiday: 'jour férié',
    noHours: "Horaires absents de l'annuaire",
    hoursInComment: 'Horaires donnés en commentaire',
    allDay: 'ouvert 24 h/24',
    noComment: 'Aucun commentaire',
    noNext: 'aucune dans les 14 jours',
    unknown: 'inconnue',
    today: ({ time }) => `aujourd'hui à ${time}`,
    tomorrow: ({ time }) => `demain à ${time}`,
    weekday: ({ day, time }) => `${day} à ${time}`,
    date: ({ date, time }) => `le ${date} à ${time}`,
    open: 'ouvert',
    closed: 'fermé',
    openUntil: ({ time }) => `ouvert jusqu'à ${time}`,
    closesIn: ({ minutes }) => `ferme dans ${minutes} min`,
    opensAt: ({ short }) => `fermé · ouvre ${short}`,
    holidayRow: ({ short }) => `férié · ouvre ${short}`,
    sentenceOpen: ({ name, time }) => `${name} : ouvert jusqu'à ${time}.`,
    sentenceAlways: ({ name }) => `${name} : ouvert 24 h/24.`,
    sentenceClosed: ({ name, when }) => `${name} : fermé, ouvre ${when}.`,
    sentenceHoliday: ({ name, when }) =>
      `${name} : jour férié, fermé a priori (l'annuaire ne précise rien), ouvre ${when}.`,
    sentenceNoNext: ({ name }) => `${name} : fermé, aucune ouverture dans les 14 jours.`,
    sentenceUnknown: ({ name }) => `${name} : horaires absents de l'annuaire.`,
    pickService:
      "Ajoutez un service dans l'onglet Découverte de l'intégration, puis choisissez-le ici.",
    gone: "Ce service n'est plus suivi.",
    noService:
      "Aucun service n'est suivi : ajoutez-en un dans l'onglet Découverte de l'intégration.",
    waitRow: ({ minutes }) => `ouvert · ${minutes} min d'attente`,
    noLive: 'pas de données en direct',
    sentenceWait: ({ name, minutes }) => `${name} : ouvert, ${minutes} min d'attente.`,
    sentenceWaitOpen: ({ name }) => `${name} : ouvert, temps d'attente non communiqué.`,
    sentenceWaitClosed: ({ name }) => `${name} : fermé (temps réel).`,
    sentenceWaitUnknown: ({ name }) => `${name} : pas de données en temps réel.`,
  },
  de: {
    closedToday: 'Heute geschlossen',
    holidayClosed: 'Feiertag: vermutlich geschlossen',
    holiday: 'Feiertag',
    noHours: 'Keine Öffnungszeiten im Verzeichnis',
    hoursInComment: 'Öffnungszeiten im Hinweis',
    allDay: 'rund um die Uhr geöffnet',
    noComment: 'Kein Hinweis',
    noNext: 'keine in den nächsten 14 Tagen',
    unknown: 'unbekannt',
    today: ({ time }) => `heute um ${time}`,
    tomorrow: ({ time }) => `morgen um ${time}`,
    weekday: ({ day, time }) => `${day} um ${time}`,
    date: ({ date, time }) => `am ${date} um ${time}`,
    open: 'geöffnet',
    closed: 'geschlossen',
    openUntil: ({ time }) => `geöffnet bis ${time}`,
    closesIn: ({ minutes }) => `schließt in ${minutes} Min.`,
    opensAt: ({ short }) => `geschlossen · öffnet ${short}`,
    holidayRow: ({ short }) => `Feiertag · öffnet ${short}`,
    sentenceOpen: ({ name, time }) => `${name}: geöffnet bis ${time}.`,
    sentenceAlways: ({ name }) => `${name}: rund um die Uhr geöffnet.`,
    sentenceClosed: ({ name, when }) => `${name}: geschlossen, öffnet ${when}.`,
    sentenceHoliday: ({ name, when }) =>
      `${name}: Feiertag, vermutlich geschlossen (das Verzeichnis sagt nichts), öffnet ${when}.`,
    sentenceNoNext: ({ name }) => `${name}: geschlossen, keine Öffnung in den nächsten 14 Tagen.`,
    sentenceUnknown: ({ name }) => `${name}: keine Öffnungszeiten im Verzeichnis.`,
    pickService: 'Füge einen Dienst im Tab „Entdecken“ der Integration hinzu und wähle ihn hier.',
    gone: 'Dieser Dienst wird nicht mehr verfolgt.',
    noService: 'Kein Dienst wird verfolgt: füge einen im Tab „Entdecken“ der Integration hinzu.',
    waitRow: ({ minutes }) => `geöffnet · ${minutes} Min. Wartezeit`,
    noLive: 'keine Live-Daten',
    sentenceWait: ({ name, minutes }) => `${name}: geöffnet, ${minutes} Min. Wartezeit.`,
    sentenceWaitOpen: ({ name }) => `${name}: geöffnet, Wartezeit nicht angegeben.`,
    sentenceWaitClosed: ({ name }) => `${name}: geschlossen (Echtzeit).`,
    sentenceWaitUnknown: ({ name }) => `${name}: keine Echtzeitdaten.`,
  },
  es: {
    closedToday: 'Cerrado hoy',
    holidayClosed: 'Festivo: cerrado en principio',
    holiday: 'festivo',
    noHours: 'Sin horario en el directorio',
    hoursInComment: 'Horario indicado en el comentario',
    allDay: 'abierto 24 h',
    noComment: 'Sin comentario',
    noNext: 'ninguna en los próximos 14 días',
    unknown: 'desconocida',
    today: ({ time }) => `hoy a las ${time}`,
    tomorrow: ({ time }) => `mañana a las ${time}`,
    weekday: ({ day, time }) => `el ${day} a las ${time}`,
    date: ({ date, time }) => `el ${date} a las ${time}`,
    open: 'abierto',
    closed: 'cerrado',
    openUntil: ({ time }) => `abierto hasta las ${time}`,
    closesIn: ({ minutes }) => `cierra en ${minutes} min`,
    opensAt: ({ short }) => `cerrado · abre ${short}`,
    holidayRow: ({ short }) => `festivo · abre ${short}`,
    sentenceOpen: ({ name, time }) => `${name}: abierto hasta las ${time}.`,
    sentenceAlways: ({ name }) => `${name}: abierto 24 horas.`,
    sentenceClosed: ({ name, when }) => `${name}: cerrado, abre ${when}.`,
    sentenceHoliday: ({ name, when }) =>
      `${name}: festivo, cerrado en principio (el directorio no lo indica), abre ${when}.`,
    sentenceNoNext: ({ name }) => `${name}: cerrado, ninguna apertura en los próximos 14 días.`,
    sentenceUnknown: ({ name }) => `${name}: sin horario en el directorio.`,
    pickService:
      'Añada un servicio en la pestaña Descubrir de la integración y luego elíjalo aquí.',
    gone: 'Este servicio ya no se sigue.',
    noService: 'No se sigue ningún servicio: añada uno en la pestaña Descubrir de la integración.',
    waitRow: ({ minutes }) => `abierto · ${minutes} min de espera`,
    noLive: 'sin datos en directo',
    sentenceWait: ({ name, minutes }) => `${name}: abierto, ${minutes} min de espera.`,
    sentenceWaitOpen: ({ name }) => `${name}: abierto, tiempo de espera no indicado.`,
    sentenceWaitClosed: ({ name }) => `${name}: cerrado (tiempo real).`,
    sentenceWaitUnknown: ({ name }) => `${name}: sin datos en tiempo real.`,
  },
};

// Answer of the "Status" configuration action.
export const REPORTS = {
  en: {
    noCommune: 'No commune given: type an INSEE code or a name above, then save.',
    noType: 'No type of service ticked: tick at least one above, then save.',
    commune: ({ name, code, count }) =>
      `■ ${name} (${code}): ${count} service${count === 1 ? '' : 's'} found`,
    ambiguous: 'Several communes have this name: type its INSEE code to pick another one.',
    communeError: ({ query, error }) => `■ ${query}: not found (${error})`,
    read: ({ age }) => `Directory read ${age} min ago.`,
    waiting: 'Directory not read yet.',
    error: ({ error }) => `Last error: ${error}`,
    watched: ({ count }) => `${count} service${count === 1 ? '' : 's'} added to Gladys.`,
    waitPlaces: ({ query, count }) =>
      `■ ${query}: ${count} place${count === 1 ? '' : 's'} with a waiting time`,
    waitRead: ({ age }) => `Waiting times read ${age} min ago.`,
    waitError: ({ error }) => `Waiting times unavailable: ${error}`,
    waitWatched: ({ count }) =>
      `${count} place${count === 1 ? '' : 's'} with a waiting time added to Gladys.`,
  },
  fr: {
    noCommune: 'Aucune commune : saisissez un code INSEE ou un nom ci-dessus, puis enregistrez.',
    noType: 'Aucun type de service coché : cochez-en au moins un ci-dessus, puis enregistrez.',
    commune: ({ name, code, count }) =>
      `■ ${name} (${code}) : ${count} service${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`,
    ambiguous:
      'Plusieurs communes portent ce nom : saisissez son code INSEE pour en choisir une autre.',
    communeError: ({ query, error }) => `■ ${query} : introuvable (${error})`,
    read: ({ age }) => `Annuaire lu il y a ${age} min.`,
    waiting: 'Annuaire pas encore lu.',
    error: ({ error }) => `Dernière erreur : ${error}`,
    watched: ({ count }) =>
      `${count} service${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} à Gladys.`,
    waitPlaces: ({ query, count }) =>
      `■ ${query} : ${count} lieu${count > 1 ? 'x' : ''} avec temps d'attente`,
    waitRead: ({ age }) => `Temps d'attente lus il y a ${age} min.`,
    waitError: ({ error }) => `Temps d'attente indisponibles : ${error}`,
    waitWatched: ({ count }) =>
      `${count} lieu${count > 1 ? 'x' : ''} avec temps d'attente ajouté${count > 1 ? 's' : ''} à Gladys.`,
  },
  de: {
    noCommune:
      'Keine Gemeinde angegeben: gib oben einen INSEE-Code oder einen Namen ein und speichere.',
    noType: 'Kein Diensttyp angekreuzt: kreuze oben mindestens einen an und speichere.',
    commune: ({ name, code, count }) =>
      `■ ${name} (${code}): ${count} ${count === 1 ? 'Dienst' : 'Dienste'} gefunden`,
    ambiguous:
      'Mehrere Gemeinden tragen diesen Namen: gib ihren INSEE-Code ein, um eine andere zu wählen.',
    communeError: ({ query, error }) => `■ ${query}: nicht gefunden (${error})`,
    read: ({ age }) => `Verzeichnis vor ${age} Min. gelesen.`,
    waiting: 'Verzeichnis noch nicht gelesen.',
    error: ({ error }) => `Letzter Fehler: ${error}`,
    watched: ({ count }) => `${count} ${count === 1 ? 'Dienst' : 'Dienste'} zu Gladys hinzugefügt.`,
    waitPlaces: ({ query, count }) =>
      `■ ${query}: ${count} ${count === 1 ? 'Ort' : 'Orte'} mit Wartezeit`,
    waitRead: ({ age }) => `Wartezeiten vor ${age} Min. gelesen.`,
    waitError: ({ error }) => `Wartezeiten nicht verfügbar: ${error}`,
    waitWatched: ({ count }) =>
      `${count} ${count === 1 ? 'Ort' : 'Orte'} mit Wartezeit zu Gladys hinzugefügt.`,
  },
  es: {
    noCommune: 'Ningún municipio: escriba un código INSEE o un nombre arriba y guarde.',
    noType: 'Ningún tipo de servicio marcado: marque al menos uno arriba y guarde.',
    commune: ({ name, code, count }) =>
      `■ ${name} (${code}): ${count} servicio${count === 1 ? '' : 's'} encontrado${count === 1 ? '' : 's'}`,
    ambiguous: 'Varios municipios tienen este nombre: escriba su código INSEE para elegir otro.',
    communeError: ({ query, error }) => `■ ${query}: no encontrado (${error})`,
    read: ({ age }) => `Directorio leído hace ${age} min.`,
    waiting: 'Directorio aún no leído.',
    error: ({ error }) => `Último error: ${error}`,
    watched: ({ count }) =>
      `${count} servicio${count === 1 ? '' : 's'} añadido${count === 1 ? '' : 's'} a Gladys.`,
    waitPlaces: ({ query, count }) =>
      `■ ${query}: ${count} lugar${count === 1 ? '' : 'es'} con tiempo de espera`,
    waitRead: ({ age }) => `Tiempos de espera leídos hace ${age} min.`,
    waitError: ({ error }) => `Tiempos de espera no disponibles: ${error}`,
    waitWatched: ({ count }) =>
      `${count} lugar${count === 1 ? '' : 'es'} con tiempo de espera añadido${count === 1 ? '' : 's'} a Gladys.`,
  },
};

/** One text of a table, in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** The same text in every language of the table: `{ en, fr, de, es }`. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** Joins rendered messages (or plain strings), language by language, one per line. */
export function lines(...messages) {
  const languages = Object.keys(messages.find((m) => typeof m === 'object' && m) ?? { en: '' });
  return Object.fromEntries(
    languages.map((language) => [
      language,
      messages
        .filter((message) => message !== null && message !== undefined)
        .map((message) => (typeof message === 'string' ? message : message[language]))
        .join('\n'),
    ]),
  );
}
