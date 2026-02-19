from __future__ import annotations

import conllu_path as cp
from conllu_path.tree import NodeID

import verbform_grammar
from lexicon import Lexicon, LexiconFilterFn
from verbform_grammar import Grammar

from msd_format import MorphoDictionary
import msd_format
SYNTH_FORM = 'SynthForm'

class WordMorphoInfoExtracter:

    def __init__(self, verb_grammar : Grammar,  morpho_dict : MorphoDictionary, bad_tag_dict : dict[str, str] = None):
        self.verb_grammar = verb_grammar
        self.morpho_dict = morpho_dict
        self.bad_tag_dict = bad_tag_dict

    def get_lemma_and_features(self, node : cp.Tree) -> (dict, list[str]):
        """Returns a dict containing morphological information about the node and a list of uids
        of the nodes involved (if a synthetic form, there will be several) """
        upos = node.sdata('upos')
        lemma = node.sdata('lemma')
        deprel = node.sdata('deprel')
        uid_list = [node.uid()]
        to_be_operator = upos == 'AUX' and lemma == 'fi' and deprel in ('aux:pass', 'cop')
        if upos == 'VERB' or to_be_operator:
            tokens, uid_list = self.extract_verb_and_functionals(node if upos == 'VERB' else node.parent)
            if to_be_operator: # this is actually a predicative to be
                # tokens = tokens[:-1] # eliminate predicative / passive participle
                tokens[-1]['Type'] = 'Main'
            form_info = self.verb_grammar.value_dict_sequence_matches(tokens)
            if form_info:
                form_info = form_info[0]
                rule_name, info_dict = form_info
                info_dict[SYNTH_FORM] = {rule_name}
                info_dict = {k:list(v)[0] for k,v in info_dict.items()}
                return info_dict, uid_list

        xpos = node.sdata('xpos')
        if xpos[0] == 'D' and len(xpos) == 10: # issue in RoRefTrees
            xpos = xpos[::-1].replace('--', '-', 1)[::-1]
        morpho_features = self.morpho_dict.features_from_tag(xpos, self.bad_tag_dict)
        if morpho_features is None:
            raise Exception('Error getting morpho features from tag ' + xpos)
        info_dict = {'lemma':lemma} | morpho_features
        if to_be_operator:
            info_dict['Type'] = 'Main'
        if upos == 'NOUN':
            info_dict['Person'] = '3' # for agreements and such
        if upos in ('NOUN', 'ADJ', 'DET', 'NUM') and 'Case' not in info_dict:
            # determine the case
            if cp.Search('/[deprel=cop]').match(node): # is predicative nominal
                info_dict['Case'] = 'Dir'
            else: # first determine phrase root
                if      (upos == 'ADJ' and deprel == 'amod') or \
                        (upos == 'NUM' and deprel == 'nummod') or \
                        (upos == 'DET' and lemma != 'al'):
                    phrase_root = node.parent
                elif upos == 'DET' and lemma == 'al':
                    return info_dict, uid_list # no case
                else:
                    phrase_root = node
                dets : list[cp.Tree] = cp.Search('<[deprel=det,nummod,amod]').match(phrase_root)
                case = 'Dir'
                for d in dets:
                    if 'Gen' in d.sdata('feats.Case') or 'Dat' in d.sdata('feats.Case'):
                        case = 'Obl'
                info_dict['Case'] = case

        return info_dict, [node.uid()]

    def extract_verb_and_functionals(self, node: cp.Tree) -> (list[dict], list[str]):
        functionals = [c for c in node.children() if cp.Search('.[deprel~aux,mark,cop upos=AUX,PART,VERB]').match(c)]
        if not cp.Search('/[deprel=cop,aux:pass]').match(node): # include root if not predicative noun / passive participle
            functionals = functionals + [node]
        dicts = [{'lemma': n.sdata('lemma')} | self.morpho_dict.features_from_tag(n.sdata('xpos'), self.bad_tag_dict) for n in functionals]
        return dicts, [n.uid() for n in functionals]

from synthetic_form_generator import SyntheticFormGenerator, roFilterFnDict


class WordFormGenerator:
    def __init__(self, lex: Lexicon, morph_dict: MorphoDictionary, synth_form_grammar: verbform_grammar.Grammar,
                 filterFnDict: dict[str, LexiconFilterFn] = None):
        self.lex = lex
        self.morph_dict = morph_dict
        self.grammar = synth_form_grammar
        self.filterFnDict = filterFnDict if filterFnDict else {}
        self.synth_form_generator = SyntheticFormGenerator(lex, morph_dict, synth_form_grammar, filterFnDict)

    def generate_form(self, feature_dict : dict[str, str], reduce_to_single_form : bool = True) -> list[str] | None:
        if 'lemma' not in feature_dict:
            return None
        if SYNTH_FORM in feature_dict:
            return self.synth_form_generator.rule_to_forms(feature_dict[SYNTH_FORM], feature_dict, reduce_to_single_form)
        forms = self.lex.lemma_xpos_to_form(feature_dict['lemma'],
                                    self.morph_dict.tag_from_features(feature_dict, False),
                                    self.filterFnDict.get(SyntheticFormGenerator.DEFAULT))
        if not forms:
            return None
        if reduce_to_single_form:
            forms = forms[0]
        return [forms]


bad_tag_dict = {
'Vmg-------y':'Vmg----y',
'Qz-y':'Qzy',
'Va--3s----y':'Va--3s-y',
'Qs-y':'Qsy',
'Va--3-----y':'Va--3--y',
'Vmip1s----y':'Vmip1s-y',
'Va--3p----y':'Va--3p-y',
'Vaip3s----y':'Vaip3s-y',
'Vmii3p----y':'Vmii3p-y',
'Vmsp3-----y':'Vmsp3--y',
'Vmii1-----y':'Vmii1--y',
'Vmip3-----y':'Vmip3--y',
'Vmm-2s----y':'Vmm-2s-y',
'Vmip3s----y':'Vmip3s-y',
'Qn-y':'Qny',
'Ds3msrs-y':'Ds3msrsy',
'Vag-------y':'Vag----y',
'Ncmrn':'Ncmprn',
'Vmip2s----y':'Vmip2s-y',
'Di3-----y':'Di3----y',
'Dd3fpr--y':'Dd3fpr-y',
'Vaip3p----y':'Vaip3p-y',
'Va--2p----y':'Va--2p-y',
'Ds1msrs-y':'Ds1msrsy',
'Vmnp------y':'Vmnp---y',
'Va--2s----y':'Va--2s-y',
'Ds1fsrs-y':'Ds1fsrsy',
'Vmp--sm---y':'Vmp--smy',
'Di3-sr--y':'Di3-sr-y',
'Va--1s----y':'Va--1s-y',
'Vmip1p----y':'Vmip1p-y',
'Va--1-----y':'Va--1--y',
'Vmis3s----y':'Vmis3s-y',
'Vmil3s----y':'Vmil3s-y',
'Vmis3p----y':'Vmis3p-y',
'Vmil3p----y':'Vmil3p-y',
'Vmii3s----y':'Vmii3s-y',
}

if __name__ == "__main__":
    roVerbGrammar = verbform_grammar.generateRoVerbGrammar()
    roMorphoDict = msd_format.generate_roMorphoDictionary()
    lex = Lexicon.from_json('./lexicons/reterom.v1.1.json')
    w_ex = WordMorphoInfoExtracter(roVerbGrammar, roMorphoDict, bad_tag_dict)
    w_gen = WordFormGenerator(lex, roMorphoDict, roVerbGrammar, roFilterFnDict)

    doc = cp.Doc.from_conllu('./conllu/rrt-all.3.1.annot-uid.conllu')


    def to_and_fro(id: str, print_flag = True):
        n = doc.get_node(id)
        d, uid_list = w_ex.get_lemma_and_features(n)
        if print_flag:
            print(d, uid_list)
        f = w_gen.generate_form(d)
        if print_flag:
            print(f)


    d = to_and_fro('train-5055/4')










