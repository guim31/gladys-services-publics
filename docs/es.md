# Horaires des services publics

El **horario de apertura de los servicios públicos de su municipio francés** (ayuntamiento,
prefectura y subprefectura, gendarmería, comisaría, CAF, CPAM, France services, France Travail,
oficinas de impuestos…) según el **directorio de la administración francesa** de
Service-Public.fr (DILA). **Sin cuenta ni clave.**

> El horario es **orientativo**: es el que publica el directorio. Compruébelo con el servicio
> antes de desplazarse, sobre todo un día festivo o durante las vacaciones escolares.

Integración no oficial, sin relación con la DILA ni con los servicios citados. Probada con las
respuestas reales del directorio (Toulouse y Fonsorbes, 29/10/2026), aún no en una instancia
real de Gladys: sus comentarios son bienvenidos.

## Lo que obtiene

- Un **dispositivo por servicio** que añada: abierto ahora o no, horario de hoy, próxima apertura,
  el comentario del directorio («sur rendez-vous», «fermé le …»), mostrado tal cual.
- Un **widget** «Servicios públicos»: sus servicios en una línea cada uno, en verde si están
  abiertos, en naranja en la última media hora, en rojo si están cerrados.
- Tres **disparadores de escena**: un servicio abre, un servicio cierra, un servicio cierra en
  30 minutos.
- Una **acción de escena** «¿Está abierto?»: sus servicios en una frase, con la hora de cierre o de
  la próxima apertura.

## Requisitos

- Gladys Assistant **5.3.0** o posterior.
- Acceso a Internet desde Gladys: el directorio y geo.api.gouv.fr son API públicas.
- Ninguna cuenta, ninguna clave de API.

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub**.
2. Pegue `https://github.com/guim31/gladys-services-publics` y confirme.
3. Abra la integración una vez instalada para configurarla.

## Configuración

### Ajustes

| Ajuste                           | Función                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Municipios                       | Códigos INSEE o nombres, separados por comas (5 como máximo): `31555, Fonsorbes`.                                                                                          |
| Tipos de servicio                | Los tipos propuestos. Por defecto: ayuntamiento, prefectura, subprefectura, gendarmería, comisaría, CAF, CPAM, France services, France Travail, impuestos de particulares. |
| Lectura del directorio           | Cada 6 horas, cada 12 horas (por defecto) o una vez al día.                                                                                                                |
| Idioma de los nombres y mensajes | Idioma de las funciones, del widget y de la acción de escena (francés por defecto).                                                                                        |

Un nombre que llevan varios municipios designa el más poblado: la acción **Estado** lo indica, y
el código INSEE (en la ficha del municipio, por ejemplo en el sitio del Insee) lo aclara.

### Añadir servicios

1. Escriba sus municipios, marque los tipos de servicio y guarde.
2. Abra la pestaña **Descubrir** de la integración: aparecen los servicios situados en esos
   municipios y los que los cubren (la gendarmería del pueblo vecino, por ejemplo).
3. Añada a Gladys los que le interesen.

Un servicio añadido sigue vigilado aunque después quite su municipio de los ajustes. ¿Su CAF o su
CPAM está en la ciudad cercana? Añada esa ciudad a los municipios.

### Comprobar

La acción **Estado** de la página de la integración muestra los municipios encontrados, el número
de servicios propuestos, la última lectura del directorio y el último error.

## Dispositivos

Cada servicio añadido se convierte en un dispositivo de solo lectura con cuatro funciones:

| Función          | Tipo             | Contenido                                                                        |
| ---------------- | ---------------- | -------------------------------------------------------------------------------- |
| Abierto ahora    | binario (1 = sí) | Calculado cada minuto. Sin valor si el directorio no da horario.                 |
| Horario de hoy   | texto            | `08:30–12:00, 13:30–18:00`, «Cerrado hoy», «Festivo: cerrado en principio»…      |
| Próxima apertura | texto            | «hoy a las 13:30», «mañana a las 08:30», «el lunes a las 08:30», «abierto 24 h». |
| Comentario       | texto            | Las observaciones del directorio, tal cual (en francés).                         |

El horario se lee en la zona horaria del servicio (París en la Francia metropolitana, la hora
local en ultramar).

## Widget del panel

El widget **Servicios públicos** muestra una línea por servicio vigilado (10 como máximo), con el
nombre que usted le dio en Gladys: «abierto hasta las 18:00», «cierra en 20 min», «cerrado · abre
lun. 08:30». Ajustes: los servicios mostrados (vacío: todos) y si se muestran las horas.

## Disparadores de escena

| Disparador                       | Variables                                          |
| -------------------------------- | -------------------------------------------------- |
| Un servicio abre                 | servicio, hora de cierre                           |
| Un servicio cierra               | servicio, próxima apertura                         |
| Un servicio cierra en 30 minutos | servicio, hora de cierre, minutos antes del cierre |

Cada disparador puede limitarse a algunos servicios. Siguen el horario del directorio: nada se
dispara al arrancar, ni tras una interrupción de más de cinco minutos.

## Acción de escena

**¿Está abierto?** devuelve una frase por servicio elegido (vacío: todos): «…: abierto hasta las
12:00.», «…: cerrado, abre mañana a las 08:30.». Salidas: `sentence`, `open_count` (servicios
abiertos) y `services_count`, utilizables en «Continuar solo si».

## Ejemplos de escenas

- Cada mañana a las 8, enviar «¿Está abierto?» para el ayuntamiento y la CAF por Telegram.
- Cuando la CPAM cierre en 30 minutos y haya alguien en casa, decirlo por el altavoz.
- Un botón «voy al ayuntamiento»: continuar solo si `open_count` vale 1.

## Datos y actualización

- **Directorio de la administración** (Service-Public.fr, DILA), API pública de Opendatasoft, sin
  clave, bajo la Licence Ouverte. La integración solo pide los campos útiles (nombre, tipo,
  municipio, horario, comentario, dirección, teléfono, enlace): nunca los nombres de los
  responsables.
- **geo.api.gouv.fr** (DINUM) convierte un nombre de municipio en su código INSEE, una vez por
  arranque.
- El directorio se lee cada 12 horas por defecto: una petición por municipio (dos o tres para una
  gran ciudad), más una para los servicios vigilados fuera de sus municipios. Abierto o cerrado se
  calcula luego cada minuto, sin ninguna petición.
- Tras un fallo, nuevo intento 15 minutos después; el horario ya leído se sigue usando.

## Solución de problemas

- **Ningún servicio en Descubrir**: consulte la acción Estado (¿municipio no encontrado? ¿ningún
  tipo marcado?). Algunos municipios pequeños solo tienen su ayuntamiento en el directorio.
- **«Sin horario en el directorio»**: el servicio no publica horario (muchas brigadas de
  gendarmería), o solo en su comentario. El estado «abierto» queda entonces vacío.
- **El municipio equivocado**: escriba su código INSEE en lugar de su nombre.
- Registros detallados: variable `LOG_LEVEL=debug`.

## Limitaciones

- **Días festivos**: el directorio no dice nada. Un servicio que abre los domingos se supone
  abierto, cualquier otro se supone cerrado, y los textos lo indican. Se tienen en cuenta los
  festivos propios de Alsacia-Mosela y de los departamentos de ultramar.
- **Los comentarios no se interpretan**: «fermé le 24 décembre» o «sur rendez-vous» no cambian el
  estado «abierto», se muestran en el comentario.
- Las franjas sin horas utilizables («00:00 a 00:00») se ignoran, nunca se adivinan.
- Las vacaciones escolares y los cierres excepcionales solo se conocen si el directorio los
  publica.

## Créditos

- Datos: [Directorio de la administración](https://api-lannuaire.service-public.fr), Direction de
  l'information légale et administrative (DILA), Licence Ouverte 2.0.
- Municipios: [geo.api.gouv.fr](https://geo.api.gouv.fr), DINUM, Licence Ouverte 2.0.
- Días festivos: las mismas reglas que [gladys-holidays](https://github.com/guim31/gladys-holidays)
  (date-holidays), reescritas aquí sin dependencia.
