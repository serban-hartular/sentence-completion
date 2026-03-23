import pandas as pd

nounform_df : pd.DataFrame | None = None
nouns_df : pd.DataFrame | None = None

from pathlib import Path
HERE = Path(__file__).resolve().parent
FORM_PATH = HERE / 'noun_forms.tsv'
INTRINSIC_PATH = HERE / 'nouns_intrinsic.tsv'

FORM_COLUMNS = {'Lemma', 'LemmaID', 'Number', 'Definite', 'Case', 'Form'}
INTRINSIC_COLUMNS = {'Lemma', 'Gender', 'LemmaID'}
NUMBERS = {'Sing':{'Sing', 'Sg', 'SG', 1}, 'Plur':{'Plur', 'Pl', 'PL', 2}}
DEFINITE = {'Bare':{'Bare', 'Indef', False}, 'Def' : {'Def', True}}
CASES = {'Dir':{'Dir', 'Nom', 'Acc'}, 'Obl':{'Obl', 'Gen', 'Dat'}}

def to_df_value(value : int|str|bool, ref_dict : dict) -> str:
    for k,v in ref_dict.items():
        if value in v:
            return k
    raise Exception(f'Unknown value {v} in ref_dict {ref_dict}!')


def init_df(formpath : str = '', intrinsicpath : str = ''):
    global nounform_df
    global nouns_df
    formpath = formpath if formpath else FORM_PATH
    intrinsicpath = intrinsicpath if intrinsicpath else INTRINSIC_PATH

    nounform_df = pd.read_csv(formpath, sep='\t', encoding='utf-8')
    # sanity check
    if not FORM_COLUMNS.issubset(nounform_df.columns):
        raise Exception('nounform_df does not contain all columns ' + str(FORM_COLUMNS))
    
    nouns_df = pd.read_csv(intrinsicpath, sep='\t', encoding='utf-8')
    # sanity check
    if not INTRINSIC_COLUMNS.issubset(nouns_df.columns):
        raise Exception('nouns_df does not contain all columns ' + str(INTRINSIC_COLUMNS))


def get_noun_form(lemma : str, number : int|str, definite : str|bool, case_form : str) -> list[str]:
    if nounform_df is None:
        raise Exception('noun form df is not initialized.')
    number = to_df_value(number, NUMBERS)
    definite = to_df_value(definite, DEFINITE)
    case_form = to_df_value(case_form, CASES)
    df = nounform_df
    result_df = df[(df['Lemma']==lemma) & (df['Number']==number) & (df['Definite']==definite) & (df['Case']==case_form)]
    return result_df['Form'].to_list()

def get_noun_gender(lemma : str) -> list[str]:
    global nouns_df
    if nouns_df is None:
        raise Exception('intrinsic noun info df is not initialized')
    df = nouns_df
    result_df = df[df['Lemma']==lemma]
    return result_df['Gender'].to_list()

