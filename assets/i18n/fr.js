/**
 * French copy for the Kikouchou landing page.
 *
 * Vocabulary is kept in step with the app’s own `fr/translation.json`
 * ("voyage", "Chambres", "Participants", "Chauffeur", "Proposer une
 * répartition", …) so the site and the product speak the same French.
 *
 * Adding another language: copy this file, change the locale key, and add the
 * code to LOCALES in assets/app.js plus a button in the header’s .lang group.
 *
 * Every key here is read by index.html. When a section goes, its keys go with
 * it, so this file never grows a tail of copy nothing renders.
 */
window.KKC_I18N = window.KKC_I18N || {};
window.KKC_I18N.fr = {
  "html.lang": "fr",
  "html.title": "Kikouchou : qui dort où, et qui va chercher qui",
  "html.description": "Kikouchou enlève la charge mentale des vacances en groupe à la personne qui organise : chambres, arrivées, trajets en voiture et argent du groupe sur un seul plan partagé que chacun remplit lui-même. Gratuit, hors ligne, open source.",

  "nav.skip": "Aller au contenu",
  "nav.how": "Comment ça marche",
  "nav.rooms": "Chambres",
  "nav.money": "Argent",

  "a11y.theme": "Changer de thème",

  "cta.open": "Ouvrir l’app",

  "a11y.menu": "Menu",

  "hero.title": "Qui dort où, et <em>qui va chercher qui</em>.",
  "hero.lede": "Vous avez loué une maison entre amis. Onze personnes, six chambres, des arrivées étalées sur quatre jours et trois trains à aller chercher à la gare. Kikouchou sort tout ça de la tête d’une seule personne et le pose sur un plan que tout le monde voit et remplit lui-même.",

  "cta.openFree": "Ouvrir l’app, c’est gratuit",
  "cta.see": "Voir comment ça marche",

  "hero.note": "Rien à installer, rien à payer. Créez un voyage : il est déjà enregistré sur votre appareil.",
  "hero.trust1": "Chambres, trajets en voiture et comptes au même endroit",
  "hero.trust2": "Un seul lien, chacun remplit sa partie",
  "hero.trust3": "Fonctionne sans réseau au fond du gîte",

  "vsl.title": "Pourquoi Kikouchou existe · 30 secondes, sans son",
  "vsl.alt": "Une animation : une conversation de groupe qui se remplit de questions sans réponse, puis le même voyage posé dans Kikouchou avec les chambres, les trajets et l’argent du groupe.",
  "vsl.s1eyebrow": "Vendredi, 18h02 · la conversation de groupe",
  "vsl.s1line1": "Onze personnes. Six chambres.",
  "vsl.s1line2": "Quatre jours d’arrivées.",
  "vsl.s1msg1": "« Je suis dans quelle chambre ? »",
  "vsl.s1msg2": "« Quelqu’un prend Zoé à 22h40 ? »",
  "vsl.s1msg3": "« On est neuf ou onze à dîner ? »",
  "vsl.s1msg4": "« Qui a payé le bois ? »",
  "vsl.s1count": "312 messages · 0 réponse",
  "vsl.s2eyebrow": "Quatre jours plus tard",
  "vsl.s2line1": "Tout tient dans une seule tête.",
  "vsl.s2line2": "Et cette tête est censée être en vacances.",
  "vsl.s2who": "Aurélia · celle qui a réservé",
  "vsl.s2chip": "22h40. Zoé attend toujours à la gare.",
  "vsl.s3eyebrow": "Toute l’astuce",
  "vsl.s3line1": "Vous envoyez un seul lien.",
  "vsl.s3line2": "Chacun remplit sa propre partie.",
  "vsl.s3meta": "Aucun compte demandé, et rien à installer.",
  "vsl.s4eyebrow": "Deux minutes plus tard",
  "vsl.s4line1": "Qui dort où : c’est réglé.",

  "mock.tlTitle": "Maison d’été · 12–18 août · Chronologie",
  "mock.tonight": "9 invités ce soir",
  "mock.online": "3 personnes en ligne",
  "mock.d1": "Mar 12",
  "mock.d2": "Mer 13",
  "mock.d3": "Jeu 14",
  "mock.d4": "Ven 15",
  "mock.d5": "Sam 16",
  "mock.d6": "Dim 17",
  "mock.d7": "Lun 18",
  "mock.n1": "Aurélia",
  "mock.roomMaster": "Chambre parentale",
  "mock.n2": "Tom",
  "mock.roomAttic": "Grenier",
  "mock.n3": "Alice + Julie",
  "mock.roomGarden": "Chambre jardin · 2 personnes",
  "mock.n4": "Martin",
  "mock.roomBunk": "Dortoir",
  "mock.n5": "Zoé",
  "mock.roomBlue": "Chambre bleue",
  "mock.n6": "Titouan",
  "mock.roomSofa": "Canapé-lit",

  "vsl.s5eyebrow": "Et le reste de la charge",
  "vsl.s5line1": "Trajets, argent, sans réseau.",

  "mock.legendTrain": "Jeu 14 · 22h40 · Zoé, TGV 8541 pour Vannes",

  "vsl.s5pickup": "Martin conduit. Il part à 22h10.",

  "mock.legendPickup": "Nécessite un transport",

  "vsl.s5money": "Bois, courses et caution : 248 €",
  "vsl.s5moneyMeta": "Partagé par nuits. Alice doit 31 € à Tom.",
  "vsl.s5offline": "Pas de réseau au gîte",
  "vsl.s5offlineMeta": "Le plan s’ouvre quand même. Il se synchronise au retour.",
  "vsl.s6eyebrow": "Kikouchou",
  "vsl.s6line1": "Arrêtez d’être le tableur du groupe.",
  "vsl.s6line2": "Vos prochaines vacances, remplies par tout le monde.",
  "vsl.s6meta": "Sans compte pour commencer, et le code est sur GitHub",
  "vsl.pause": "Mettre l’animation en pause",
  "vsl.play": "Lancer l’animation",
  "vsl.transcript": "Onze personnes, six chambres, quatre jours d’arrivées, et une seule personne qui garde tout ça en tête pendant que trois cents messages restent sans réponse. Kikouchou transforme ça en un seul lien. Chacun l’ouvre et remplit sa propre partie : les chambres, les heures d’arrivée, les trajets depuis la gare et l’argent du groupe. Rien à installer, pas de compte pour commencer, et ça s’ouvre même quand le gîte n’a pas de réseau. Ouvrez l’app. Elle ne coûte rien.",

  "how.eyebrow": "Comment ça marche",
  "how.title": "Vous y passez deux minutes. Le groupe fait le reste.",
  "how.youWho": "Vous, l’organisateur",
  "how.youT": "Vous préparez le voyage une fois",
  "how.you1": "<strong>Créez le voyage.</strong> Nom, dates, et les chambres avec leurs lits.",
  "how.you2": "<strong>Collez le lien dans la conversation de groupe.</strong> C’est votre dernier message de logistique.",
  "how.crowdWho": "Tous les autres, chacun sur son téléphone",
  "how.crowdT": "Chacun remplit sa partie",
  "how.c1": "<strong>Il réserve un lit</strong> pour les nuits où il est là.",
  "how.c2": "<strong>Il ajoute son train</strong> ou son heure d’arrivée en voiture.",
  "how.c3": "<strong>Il demande qu’on vienne le chercher</strong> à la gare, ou propose de le faire.",
  "how.c4": "<strong>Il note ce qu’il a payé</strong> pour les courses ou le bois.",

  "cta.start": "Créer votre voyage, c’est gratuit",

  "rooms.eyebrow": "Chambres et lits",
  "rooms.title": "Chaque lit, chaque nuit, sur un seul tableau.",
  "rooms.lede": "Chaque chambre connaît son nombre de lits. Vous placez un participant, et le tableau dit tout de suite ce qui est complet et ce qui reste libre.",

  "cta.tryBoard": "Essayer le tableau",

  "feat.f1alt": "Le tableau des chambres : trois colonnes avec leur nombre de lits, des invités placés dans les emplacements, une chambre complète et un lit encore libre.",

  "mock.roomsTitle": "Chambres · 6 chambres · 11 lits",
  "mock.roomsFilter": "Disponibilités du 14 au 16 août",
  "mock.optimise": "Proposer une répartition",
  "mock.r1": "Chambre parentale",
  "mock.r1c": "2 lits · 1 place libre",
  "mock.a1": "Aurélia",
  "mock.freeBed": "Lit libre",
  "mock.r2": "Chambre jardin",
  "mock.r2c": "2 lits · Complet",
  "mock.a2": "Alice",
  "mock.a3": "Julie",
  "mock.r3": "Dortoir",
  "mock.r3c": "4 lits · 2 places libres",
  "mock.a4": "Martin",
  "mock.a5": "Titouan",
  "mock.unassigned": "1 invité sans chambre",
  "mock.dragHint": "Glissez une étiquette sur une chambre",

  "money.eyebrow": "L’argent du groupe",
  "money.title": "Qui a payé, qui doit, et le chemin le plus court pour solder.",
  "money.lede": "Vous notez une dépense et vous dites pour qui elle est. À la fin, l’app donne le minimum de remboursements qui met tout le monde à zéro.",

  "cta.tryMoney": "Partager une première dépense",

  "feat.f5alt": "La page des comptes : trois lignes de dépense avec qui a payé et comment elles sont partagées, puis les soldes et les deux remboursements qui soldent le séjour.",

  "mock.moneyTitle": "Comptes · Maison d’été",
  "mock.moneySpent": "1 462 € dépensés",
  "mock.moneySettle": "2 remboursements à faire",
  "mock.m1a": "1 200 €",
  "mock.m1w": "Lun 11",
  "mock.m1n": "La maison",
  "mock.m1l": "Aurélia a payé · au prorata des nuits",
  "mock.m1c": "6 invités",
  "mock.m2a": "184 €",
  "mock.m2w": "Mar 12",
  "mock.m2n": "Deux caddies, le vin compris",
  "mock.m2l": "Tom a payé · en parts égales",
  "mock.m2c": "Courses",
  "mock.m3a": "78 €",
  "mock.m3w": "Jeu 14",
  "mock.m3n": "Restaurant à Vannes",
  "mock.m3l": "Julie a payé · seulement les quatre qui y sont allés",
  "mock.m3c": "Restaurant",
  "mock.moneyOwed": "Remboursements à faire",
  "mock.m4n": "Tom rembourse Aurélia",
  "mock.m4l": "Solde leurs deux comptes",
  "mock.m4a": "146 €",
  "mock.m5n": "Zoé rembourse Aurélia",
  "mock.m5l": "Deux nuits, plus sa part du jeudi",
  "mock.m5a": "92 €",

  "rev.q1": "« On était onze dans le Morbihan. Personne ne m’a demandé qui dormait où. Pas une fois. »",
  "rev.a1": "Aurélia · maison d’été",
  "rev.q2": "« Les allers-retours à la gare se sont réglés tout seuls. Rien que pour ça, le lien valait le coup. »",
  "rev.a2": "Guillaume · chalet au ski",
  "rev.q3": "« On a soldé la semaine en deux virements au lieu de neuf. »",
  "rev.a3": "Julie · réunion de famille",

  "final.title": "Votre prochain voyage est déjà un tableur. Faites-en un plan.",
  "final.lede": "Créez le voyage, partagez le lien, et laissez chacun régler son lit et son train. Deux minutes, et ça cesse d’être le problème d’une seule personne.",

  "cta.install": "Installer sur votre téléphone",

  "final.fine": "Le plan s’ouvre sans réseau. Un compte ne sert qu’à le modifier à plusieurs.",

  "footer.about": "Une petite app pour la partie la moins reposante des vacances en groupe : qui dort où, et qui va chercher qui. Comme ça, tout ne repose pas sur une seule tête.",
  "footer.product": "Produit",
  "footer.good": "Bon à savoir",
  "footer.privacy": "Votre voyage est enregistré sur votre appareil. Un compte seulement quand vous éditez à plusieurs, sur des serveurs européens.",
  "footer.install": "Installez-le sur l’écran d’accueil de votre iPhone, de votre Android ou de votre ordinateur",
  "footer.free": "Gratuit, open source, sans publicité et sans pistage de ce qu’il y a dans votre voyage.",
  "footer.ask": "Une question ? Posez-la sur GitHub.",
  "footer.project": "Projet",
  "footer.source": "Code source",
  "footer.issues": "Signaler un problème",
  "footer.licence": "Licence MIT",
  "footer.instagram": "Instagram",
  "footer.copy": "Kikouchou, fait pour de vraies vacances.",
};
