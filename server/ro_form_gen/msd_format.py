from __future__ import annotations


"""https://nl.ijs.si/ME/V6/msd/html/msd-ro.html"""

import dataclasses
from typing import ClassVar, Dict

YES_NO = {'n': 'No', 'y': 'Yes'}

@dataclasses.dataclass
class MorphoFeature:
    name : str
    values : dict[str, str]
    default : str
    remove_if_default : bool = False

    def __post_init__(self):
        for v in self.values.keys():
            if len(v) != 1:
                raise Exception(f'Error, key {v} is not one character long')
            if self.default not in self.values:
                raise Exception(f'Error, default {self.default} not a valid value')

PersonFeature = MorphoFeature('Person', {'1': '1', '2': '2', '3': '3'}, '3')
NumberFeature = MorphoFeature('Number', {'s': 'Sing', 'p': 'Plur'}, 's')
GenderFeature = MorphoFeature('Gender', {'m': 'Masc', 'f': 'Fem', 'n':'Neutr'}, 'm')
DefiniteFeature = MorphoFeature('Definiteness', YES_NO, 'n')
Case2Feature = MorphoFeature('Case', {'v':'Voc', 'r':'Dir', 'o':'Obl'}, 'r')
Case4Feature = MorphoFeature('Case', {'v':'Voc', 'n':'Nom', 'g':'Gen', 'd':'Dat', 'a':'Acc'}, 'n')
CaseAllFeature = MorphoFeature('Case', Case2Feature.values | Case4Feature.values, 'r')
DegreeFeature = MorphoFeature('Degree', {'p':'Pos', 'c':'Cmp', 's':'Sup'}, 'p')

IsCliticFeature = MorphoFeature('Clitic', YES_NO, 'n', True)


@dataclasses.dataclass
class MorphoClass:
    category : str
    features : list[MorphoFeature]
    ANY : ClassVar[str] = '-'
    def __post_init__(self):
        if len(self.category) != 1:
           raise Exception(f'Category {self.category} of length not 1')

    def tag_from_features(self, value_dict : dict[str, str], remove_feat_from_dict : bool = False) -> str:
        """Warning! This will change the value_dict """
        tag = self.category
        for feature in self.features:
            if feature is None or feature.name not in value_dict:
                tag += MorphoClass.ANY
                continue
            values_to_symbols = {v:k for k,v in feature.values.items()}
            if value_dict[feature.name] not in values_to_symbols:
                raise Exception(f'Value {value_dict[feature.name]} not in morpho-feature {feature.name}')
            # add symbol
            s = values_to_symbols[value_dict[feature.name]]
            if remove_feat_from_dict:
                value_dict.pop(feature.name)
            if feature.remove_if_default and s == feature.default:
                s = MorphoClass.ANY
            tag += s
        return tag.rstrip('-')

    def features_from_tag(self, xpos : str, bad_tag_dict : dict[str, str] = None) -> dict[str, str]:
        orig_xpos = xpos
        if bad_tag_dict and xpos in bad_tag_dict:
            xpos = bad_tag_dict[xpos]
        if xpos[0] != self.category:
            raise Exception('Tag does not match category')
        tag = xpos[1:]
        if len(tag) > len(self.features):
            raise Exception(f'Tag {xpos} is longer than num of features' + (f' (orig xpos {orig_xpos})' if orig_xpos != xpos else ''))
        feature_dict = {'category':self.category}
        for feat, c in zip(self.features, tag):
            if c == MorphoClass.ANY:
                continue
            if feat is None:
                continue
            if c not in feat.values:
                raise Exception(f'Unknown value {c} for feature {feat.name}')
            feature_dict[feat.name] = feat.values[c]
        return feature_dict

class MorphoDictionary(Dict[str, MorphoClass]):
    def __init__(self, ml : list[MorphoClass]):
        super().__init__()
        self.update({m.category : m for m in ml})


    def features_from_tag(self, xpos : str, bad_tag_dict : dict[str, str] = None) -> dict|None:
        category = xpos[0]
        for m_class in self.values():
            if m_class.category == category:
                return m_class.features_from_tag(xpos, bad_tag_dict)
        return None

    def tag_from_features(self, feature_dict : dict[str, str], remove_feat_from_dict : bool) -> str|None:
        category = feature_dict.get('category')
        if category not in self:
            return None
        return self[category].tag_from_features(feature_dict, remove_feat_from_dict)


def generate_roMorphoDictionary() -> MorphoDictionary:
    RoVerbs = MorphoClass('V', [
            MorphoFeature('Type', {'m':'Main', 'a':'Aux', 'o':'Modal', 'c':'Copula'}, 'm'),
            MorphoFeature('Mood', {'i': 'Ind', 's': 'Sub', 'm': 'Imp', 'n': 'Inf', 'p': 'Part', 'g': 'Ger'}, 'n'),
            MorphoFeature('Tense', {'p': 'Pres', 'i': 'Imp', 's': 'Past', 'l': 'Pqp'}, 'p'),
            PersonFeature,
            NumberFeature,
            GenderFeature,
            IsCliticFeature,
    ])

    RoAdjectives = MorphoClass('A', [
        MorphoFeature('Type', {'f':'qualificative'}, 'f'),
        DegreeFeature,
        GenderFeature,
        NumberFeature,
        CaseAllFeature,
        DefiniteFeature,
        IsCliticFeature,
    ])

    RoNouns = MorphoClass('N', [
        MorphoFeature('Type', {'c':'Common', 'p':'Proper'}, 'c'),
        GenderFeature,
        NumberFeature,
        Case2Feature,
        DefiniteFeature,
        IsCliticFeature
    ])

    RoParticles = MorphoClass('Q', [
        MorphoFeature('Type', {'z':'Neg', 'n':'Inf', 's':'Sub', 'a':'Aspect', 'f':'Fut'}, 'z'),
        IsCliticFeature,
    ])

    RoNumerals = MorphoClass('M', [
        MorphoFeature('Type', {'c':'Cardinal', 'o':'Ordinal', 'f':'Fractal', 'm':'Multiple', 'l':'Collect'}, 'c'),
        GenderFeature,
        NumberFeature,
        Case2Feature,
        MorphoFeature('Form', {'d':'Digit', 'r':'Roman', 'l':'Letter', 'b':'Both'}, 'l'),
        DefiniteFeature,
        IsCliticFeature,

    ])

    RoDeterminers = MorphoClass('D', [
        MorphoFeature('Type', {'d':'Dem', 'i':'Indef', 's':'Poss', 'w':'Rel', 'z':'NEg', 'h':'Emph',}, 'i'),
        PersonFeature,
        GenderFeature,
        NumberFeature,
        Case2Feature,
        MorphoFeature('Owner_Number', {'s':'Sing', 'p':'Plur'}, 's'),
        IsCliticFeature,
        MorphoFeature('Modific_Type', {'e':'Prenom', 'o':'Postnom'}, 'e')
    ])

    RoArticles = MorphoClass('T', [
        MorphoFeature('Type', {'f':'Def', 'i':'Indef', 's':'Poss', 'd':'Dem',}, 'i'),
        GenderFeature,
        NumberFeature,
        Case2Feature,
        IsCliticFeature
    ])

    RoPronouns = MorphoClass('P', [
        MorphoFeature('Type', {'p':'personal','d':'demonstrative','i':'indefinite', 's':'possessive',
                               'x':'reflexive', 'z':'negative', 'w':'int-rel'}, 'p'),
        PersonFeature,
        GenderFeature,
        NumberFeature,
        CaseAllFeature,
        MorphoFeature('Owner_Number', {'s': 'Sing', 'p': 'Plur'}, 's'),
        None,
        IsCliticFeature,
        None, None, None, None, None, # positions 9-13 are ignored
        MorphoFeature('Pronoun_Form', {'s': 'Strong', 'w': 'Weak'}, 's'),
    ])

    roMorphoDictionary = MorphoDictionary([RoAdjectives, RoNouns, RoVerbs, RoParticles, RoNumerals,
                                           RoDeterminers, RoArticles, RoPronouns])

    return roMorphoDictionary

