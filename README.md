# Atelier MIDI

**De la partition à la maquette, et de la maquette à la partition.** Deux convertisseurs gratuits, dans le navigateur, pour les compositeurs et orchestrateurs.

[Ouvrir les convertisseurs en ligne](https://morinzacary.github.io/atelier-midi/) · [Guide d’utilisation](docs/UTILISATION.md) · [Contribuer](CONTRIBUTING.md)

> Première version publique expérimentale. La conversion prépare le travail ; une vérification musicale et une finition dans le logiciel de destination restent nécessaires.

## Deux sens de conversion

| Outil | Entrée | Sortie | Usage |
| --- | --- | --- | --- |
| Partition → Maquette | `.musicxml`, `.xml`, `.mxl` | MIDI multipiste, pistes individuelles, plan JSON | Préparer une maquette dans Logic, Cubase ou un autre séquenceur |
| Maquette → Partition | `.mid`, `.midi`, plan JSON Atelier | MusicXML | Préparer une partition dans Dorico ou un autre éditeur compatible |

Les fichiers sont traités localement par le navigateur. Aucun serveur de conversion, compte ou banque de sons n’est nécessaire. Le site est statique ; il ne contient ni télémétrie applicative ni envoi de vos fichiers musicaux. GitHub assure l’hébergement.

## Démarrer

Ouvrez [le site](https://morinzacary.github.io/atelier-midi/) et choisissez le sens de conversion. Vous pouvez aussi télécharger le dépôt avec **Code → Download ZIP**, décompresser puis ouvrir `index.html`. Les pages autonomes des deux outils se trouvent dans `apps/` ; elles fonctionnent aussi hors ligne dans un navigateur récent.

Le bouton **Démonstration** du convertisseur MIDI → partition permet d’essayer sans fichier. Un petit exemple original est fourni dans [examples/](examples/).

## Partition → Maquette

- Lecture des notes, silences, triolets, liaisons de prolongation, articulations et changements de tempo/métrique.
- Répartition des articulations en pistes, regroupement de certaines parties et préparation des commandes MIDI.
- Courbes CC1/CC11 à partir des nuances et soufflets ; vélocités pour les sons percussifs et les articulations courtes ; vibrato optionnel.
- Profil d’exemple Cinematic Studio et réglages de registre, de jeu et de timing.

**Le MIDI ne charge pas Kontakt et n’installe pas de jeux d’articulations Logic.** Les commandes MIDI et le plan d’affectation aident à travailler dans une template déjà configurée. Le projet Logic personnel ayant servi au développement n’est pas fourni. Les numéros et destinations du profil sont des exemples à adapter.

## Maquette → Partition

- Lecture des MIDI standard de type 0/1 avec division temporelle PPQ.
- Regroupement des pistes par instrument, suppression des keyswitches reconnus, quantification et distribution des voix.
- Création de mesures, silences, accords, liaisons de prolongation, triolets et portées de clavier.
- Estimation des nuances depuis les contrôleurs et vélocités ; choix d’instruments transpositeurs.
- Aperçu schématique et export MusicXML.

Les projets natifs `.logicx`/`.cpr` et l’audio ne sont pas des entrées acceptées : exportez d’abord un MIDI. Une maquette MIDI ne contient pas toute la notation d’origine. L’orthographe des notes, les liaisons de phrasé, certains rythmes complexes, les anacrouses et la gravure nécessitent une relecture. Un chœur réduit en accords ne permet pas de retrouver automatiquement les voix SATB d’origine.

## Profils et compatibilité

Le [profil d’exemple](profiles/cinematic-studio.example.json) contient les correspondances MIDI et les destinations de pistes. Ce n’est pas un standard universel : les octaves des keyswitches, les canaux, les articulations et les délais dépendent de vos réglages et des versions des banques. Les décalages annoncés par l’outil sont des points de départ, pas une mesure de votre système.

Les sons, templates Logic, manuels commerciaux et partitions ayant servi aux essais privés ne sont pas distribués. Atelier MIDI est un projet indépendant, sans affiliation avec Apple, Steinberg, Native Instruments ou Cinematic Studio.

## Développement et tests

Python 3 et Node.js récents suffisent, sans installation de dépendances :

```sh
python3 build.py
node tests/reverse.test.cjs
node tests/reverse-ui.test.cjs
node tests/forward.test.cjs
python3 tests/validate_xml.py
```

Modifiez `src/` et le profil, puis régénérez les pages dans `apps/`. Les tests utilisent uniquement des motifs synthétiques originaux. Le test d’interface emploie des doublures DOM ; il ne remplace pas un essai dans un navigateur réel et dans les logiciels de musique.

## English

Atelier MIDI is an experimental, offline-capable pair of browser tools: **MusicXML to orchestral MIDI** and **MIDI to MusicXML**. Files are processed locally. The optional Cinematic Studio profile is an example configuration; no commercial samples or personal DAW projects are included. Export standard MIDI from your DAW, or MusicXML from your notation app. Review the resulting music and finish engraving in your notation editor.

## Licence

[MIT](LICENSE), y compris pour une réutilisation commerciale. Les marques citées restent la propriété de leurs titulaires.
