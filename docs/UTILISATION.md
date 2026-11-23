# Utiliser Atelier MIDI

## D’une partition vers une maquette

1. Dans Dorico ou votre éditeur, exportez la partition en MusicXML.
2. Ouvrez **Partition → Maquette**, choisissez le fichier, puis lancez l’analyse.
3. Vérifiez les instruments proposés et les réglages de banque et d’octave. Le profil fourni décrit une organisation d’exemple ; il ne connaît pas votre template personnelle.
4. Convertissez et téléchargez le MIDI. Vous pouvez aussi télécharger les pistes individuellement et le plan JSON.
5. Ouvrez votre template dans Logic/Cubase, puis importez le MIDI dans ce projet. Affectez les régions aux pistes déjà équipées des bons instruments. Contrôlez les keyswitches, les registres et les délais avant lecture.

Ouvrir le MIDI comme nouveau projet ne recrée ni les instances Kontakt ni les jeux d’articulations. Le plan JSON décrit les affectations suggérées ; cette version publique ne modifie pas automatiquement un projet Logic natif.

Les notes interprétées peuvent comporter des chevauchements et des décalages de compensation : comparez le résultat à la partition. Les délais doivent aussi être appliqués ou adaptés dans le séquenceur ; le fichier MIDI ne configure pas à lui seul les paramètres de piste de Logic.

## D’une maquette vers une partition

1. Exportez les régions MIDI de votre séquenceur dans un fichier `.mid` standard, avec la carte de tempo et de mesures si possible.
2. Ouvrez **Maquette → Partition** et choisissez le fichier. Le plan JSON de l’autre outil est également accepté.
3. Vérifiez l’instrument, la réunion des pistes, la quantification, les éventuels décalages et les options de suppression des commandes. Évitez d’appliquer une correction d’octave propre à la template d’exemple à une autre banque sans contrôle.
4. Convertissez, vérifiez l’aperçu puis téléchargez le MusicXML.
5. Importez le fichier dans Dorico, MuseScore ou un autre éditeur compatible. Relisez les altérations, les voix, les silences, les articulations et les nuances ; terminez la mise en page dans cet éditeur.

L’aperçu intégré est schématique : il ne montre pas toute la gravure finale. Les traitements automatiques de notation restent des estimations à partir du MIDI.

## Signaler une erreur

Précisez le sens de conversion, le navigateur, le logiciel d’origine, le résultat attendu et le résultat obtenu. Préférez un exemple de quelques mesures que vous avez composé vous-même. Retirez toute information confidentielle et ne joignez pas de musique ou de banques commerciales sans autorisation.
