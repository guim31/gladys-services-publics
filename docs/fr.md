# Horaires des services publics

Les **horaires d'ouverture des services publics de votre commune** (mairie, préfecture et
sous-préfecture, gendarmerie, commissariat, CAF, CPAM, France services, France Travail, centre
des finances publiques…) d'après l'**annuaire de l'administration** de Service-Public.fr (DILA).
**Sans compte ni clé.**

> Les horaires sont **indicatifs** : ce sont ceux que l'annuaire publie. Vérifiez auprès du
> service avant de vous déplacer, surtout un jour férié ou pendant les vacances.

Intégration non officielle, sans lien avec la DILA ni avec les services cités. Testée sur les
vraies réponses de l'annuaire (Toulouse et Fonsorbes, le 29/10/2026), pas encore sur une instance
Gladys réelle : vos retours sont les bienvenus.

## Ce que vous obtenez

- Un **appareil par service** que vous ajoutez : ouvert maintenant ou non, horaires du jour,
  prochaine ouverture, commentaire de l'annuaire (« sur rendez-vous », « fermé le … »), affiché tel
  quel.
- Un **widget** « Services publics » : vos services sur une ligne chacun, en vert s'ils sont
  ouverts, en orange dans la dernière demi-heure, en rouge s'ils sont fermés.
- Trois **déclencheurs de scène** : un service ouvre, un service ferme, un service ferme dans
  30 minutes.
- Une **action de scène** « Est-ce ouvert ? » : vos services en une phrase, avec l'heure de
  fermeture ou de la prochaine ouverture.

- **Temps d'attente en temps réel** des mairies qui le publient (Strasbourg aujourd'hui) : attente
  en minutes, ouvert ou fermé, et un déclencheur « Attente courte » pour savoir quand y aller.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un accès à Internet depuis Gladys : l'annuaire et geo.api.gouv.fr sont des API publiques.
- Aucun compte, aucune clé d'API.

## Installation

1. Dans Gladys, ouvrez **Intégrations → Installer depuis GitHub**.
2. Collez l'adresse `https://github.com/guim31/gladys-services-publics` et validez.
3. Ouvrez l'intégration une fois installée pour la configurer.

## Configuration

### Réglages

| Réglage                         | Rôle                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Communes                        | Codes INSEE ou noms, séparés par des virgules (5 au plus) : `31555, Fonsorbes`.                                                                                       |
| Types de service                | Les types proposés. Par défaut : mairie, préfecture, sous-préfecture, gendarmerie, commissariat, CAF, CPAM, France services, France Travail, impôts des particuliers. |
| Lecture de l'annuaire           | Toutes les 6 heures, 12 heures (par défaut) ou une fois par jour.                                                                                                     |
| Langue des noms et des messages | Langue des fonctionnalités, du widget et de l'action de scène (français par défaut).                                                                                  |

Un nom porté par plusieurs communes désigne la plus peuplée : l'action **État** le signale, et le
code INSEE (sur la fiche de la commune, par exemple sur le site de l'Insee) lève le doute.

Un code postal saisi à la place du code INSEE est aussi reconnu, sauf s'il est le code INSEE d'une autre commune : l'action **État** montre la commune retenue. Pour **Paris, Lyon et Marseille**, les
services des arrondissements sont cherchés aussi.

### Ajouter des services

1. Saisissez vos communes, cochez les types de service, enregistrez.
2. Ouvrez l'onglet **Découverte** de l'intégration : les services situés dans ces communes, et ceux
   dont la zone les couvre (la brigade de gendarmerie de la commune voisine, par exemple), y
   apparaissent.
3. Ajoutez à Gladys ceux qui vous intéressent.

Un service ajouté reste suivi même si vous retirez ensuite sa commune des réglages. Votre CAF ou
votre CPAM est dans la grande ville voisine ? Ajoutez cette ville aux communes.

### Vérifier

L'action **État** de la page de l'intégration montre les communes trouvées, le nombre de services
proposés, la dernière lecture de l'annuaire et la dernière erreur.

### Temps d'attente en temps réel

Certaines mairies publient leur temps d'attente en direct. Au 29/10/2026, seule **Strasbourg** le
fait en données ouvertes (centre administratif et mairies de quartier) ; aucune autre ville,
préfecture ni CAF ne publie de flux vivant. Les autres villes s'ajouteront quand elles le feront.

| Réglage                       | Rôle                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Lieux avec temps d'attente    | Une partie de leur nom, séparée par des virgules (10 au plus) : `Cronenbourg, Centre administratif`. `Strasbourg` les prend tous. Vide : aucun. |
| Attente courte sous (minutes) | Seuil du déclencheur « Attente courte » (10 par défaut).                                                                                        |

Chaque lieu choisi apparaît dans **Découverte** comme un appareil à part, « Mairie de quartier
Cronenbourg - Strasbourg » : vos appareils de l'annuaire ne changent pas. L'action **État** dit
combien de lieux chaque nom désigne.

## Appareils

Chaque service ajouté devient un appareil en lecture seule, à quatre fonctionnalités :

| Fonctionnalité      | Type              | Contenu                                                                             |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| Ouvert maintenant   | binaire (1 = oui) | Calculé chaque minute. Aucune valeur si l'annuaire ne donne pas d'horaires.         |
| Horaires du jour    | texte             | `08:30–12:00, 13:30–18:00`, « Fermé aujourd'hui », « Jour férié : fermé a priori »… |
| Prochaine ouverture | texte             | « aujourd'hui à 13:30 », « demain à 08:30 », « lundi à 08:30 », « ouvert 24 h/24 ». |
| Commentaire         | texte             | Les remarques de l'annuaire, telles quelles.                                        |

Les horaires sont lus dans le fuseau du service (Paris en métropole, l'heure locale outre-mer).

Un lieu avec temps d'attente devient un appareil à deux fonctionnalités : **Temps d'attente**
(durée en minutes) et **Ouvert (temps réel)** (binaire, d'après le flux de la ville, pas d'après
l'annuaire). L'attente n'est publiée que lieu ouvert : à la fermeture, plus aucune attente n'est
envoyée (jamais un 0), et Gladys garde la dernière affichée jusqu'à la réouverture ; lisez-la avec
**Ouvert (temps réel)**. Si le flux n'est plus mis à jour depuis 30 minutes, ou si un lieu en
disparaît, plus rien n'est publié pour ce lieu.

## Widget du tableau de bord

Le widget **Services publics** affiche une ligne par service suivi (10 au plus), sous le nom que
vous lui avez donné dans Gladys : « ouvert jusqu'à 18:00 », « ferme dans 20 min », « fermé · ouvre
lun. 08:30 ». Réglages : les services affichés (vide : tous), et l'affichage des heures.

Un lieu avec temps d'attente y figure aussi : « ouvert · 12 min d'attente », en vert sous le seuil,
en orange au-dessus, en rouge fermé, en gris sans données en direct.

## Déclencheurs de scène

| Déclencheur                      | Variables                                               |
| -------------------------------- | ------------------------------------------------------- |
| Un service ouvre                 | service, heure de fermeture                             |
| Un service ferme                 | service, prochaine ouverture                            |
| Un service ferme dans 30 minutes | service, heure de fermeture, minutes avant la fermeture |

Chaque déclencheur peut être limité à certains services. Ils suivent les horaires de l'annuaire :
rien n'est déclenché au démarrage, ni après une interruption de plus de cinq minutes.

**Attente courte** (variables : lieu, attente en minutes, seuil) : l'attente d'un lieu ouvert passe
sous le seuil des réglages entre deux lectures, « c'est le moment d'y aller ». Pas à l'ouverture
(l'attente du matin n'est pas une nouvelle), au plus une fois par demi-heure pour un même lieu, et
jamais après une interruption de plus de dix minutes. Les filtres de scène ne savent pas comparer :
le seuil est donc un réglage de l'intégration.

## Action de scène

**Est-ce ouvert ?** renvoie une phrase pour chaque service choisi (vide : tous) : « Mairie -
Fonsorbes : ouvert jusqu'à 12:00. », « … : fermé, ouvre demain à 08:30. ». Sorties : `sentence`,
`open_count` (services ouverts) et `services_count`, utilisables dans « Continuer seulement si ».

Un lieu avec temps d'attente y figure aussi : « Mairie de quartier Cronenbourg - Strasbourg :
ouvert, 12 min d'attente. », et compte dans `open_count` quand le flux le dit ouvert.

## Exemples de scènes

- Chaque matin à 8 h, envoyer « Est-ce ouvert ? » pour la mairie et la CAF sur Telegram.
- Quand la CPAM ferme dans 30 minutes et que quelqu'un est à la maison, le dire sur l'enceinte.
- Bouton « je passe à la mairie » : continuer seulement si `open_count` vaut 1.

## Données et rafraîchissement

- **Annuaire de l'administration** (Service-Public.fr, DILA), API Opendatasoft publique, sans clé,
  sous Licence Ouverte. L'intégration ne demande que les champs utiles (nom, type, commune,
  horaires, commentaire, adresse, téléphone, lien) : jamais les noms des responsables.
- **geo.api.gouv.fr** (DINUM) traduit un nom de commune en code INSEE, une fois par démarrage.
- L'annuaire est relu toutes les 12 heures par défaut : une requête par commune (deux ou trois
  pour une grande ville), plus une pour les services suivis hors de vos communes. Ouvert ou fermé
  est ensuite calculé chaque minute, sans requête.
- Après un échec, nouvel essai au bout de 15 minutes ; les horaires déjà lus restent utilisés.

- **Temps d'attente** : flux de la Ville et Eurométropole de Strasbourg (data.strasbourg.eu,
  Opendatasoft, sans clé, Licence Ouverte), lu toutes les 2 minutes (720 requêtes par jour), et
  seulement si un lieu est choisi ou ajouté.

## Dépannage

- **Aucun service dans Découverte** : vérifiez l'action État (commune introuvable ? aucun type
  coché ?). Certaines petites communes n'ont que leur mairie dans l'annuaire.
- **« Horaires absents de l'annuaire »** : le service ne publie pas d'horaires (beaucoup de
  brigades de gendarmerie), ou seulement en commentaire. L'état « ouvert » reste alors vide.
- **La mauvaise commune** : saisissez son code INSEE plutôt que son nom.
- Journaux détaillés : variable `LOG_LEVEL=debug`.

- **Attente courte jamais déclenchée** : le seuil est peut-être trop bas, ou le lieu ouvrait déjà
  avec une attente courte (pas de déclenchement à l'ouverture).

## Limites

- **Jours fériés** : l'annuaire n'en dit rien. Un service qui ouvre le dimanche est supposé ouvert,
  tout autre service est supposé fermé, et les textes le disent. Les jours fériés propres à
  l'Alsace-Moselle et aux départements d'outre-mer sont pris en compte.
- Les **commentaires ne sont pas interprétés** : « fermé le 24 décembre » ou « sur rendez-vous » ne
  changent pas l'état « ouvert », ils s'affichent dans le commentaire.
- Les plages sans heures utilisables (« 00:00 à 00:00 ») sont ignorées, jamais devinées.
- Les vacances scolaires et fermetures exceptionnelles ne sont connues que si l'annuaire les publie.
- Les **horaires de l'annuaire se cumulent** : quand il donne deux plages pour un même jour (accueil
  libre et accueil sur rendez-vous, par exemple), le service est dit ouvert sur l'ensemble.
- En **Nouvelle-Calédonie, Polynésie et Wallis-et-Futuna**, aucun jour férié n'est supposé (ils
  ont leurs propres jours fériés) ; le fuseau local est bien pris en compte.

- Le **temps d'attente** est celui que la ville publie (moyenne calculée par elle), mis à jour
  toutes les quelques minutes. Les lieux ne sont pas rattachés à leur fiche de l'annuaire : les noms
  diffèrent trop pour un rapprochement sûr.

## Crédits

- Données : [Annuaire de l'administration](https://api-lannuaire.service-public.fr),
  Direction de l'information légale et administrative (DILA), Licence Ouverte 2.0.
- Communes : [geo.api.gouv.fr](https://geo.api.gouv.fr), DINUM, Licence Ouverte 2.0.
- Jours fériés : mêmes règles que [gladys-holidays](https://github.com/guim31/gladys-holidays)
  (date-holidays), réécrites ici sans dépendance.
- Temps d'attente : [Durée d'attente aux mairies en temps réel](https://data.strasbourg.eu/explore/dataset/duree-dattente-aux-mairies-en-temps-reel/),
  Ville et Eurométropole de Strasbourg, Licence Ouverte.
