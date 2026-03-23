
import itertools
import re
from collections import Counter, defaultdict

import ro_form_gen
from ro_form_gen.generate_form_script import Gender, Number

# fptr = open('./manual_raw.txt', 'r', encoding='utf-8')

# form_dict = dict()

# replacements = [('ş', 'ș'), ('ţ', 'ț')]
# replacements.extend([(t[0].upper(), t[1].upper()) for t in replacements])

# for line in fptr:
#     for t0, t1 in replacements:
#         line = line.replace(t0, t1)
#     words = re.findall(r'\w+', line)
#     for form in words:
#         if form.lower() not in form_dict:
#             form_dict[form.lower()] = {'count':0, 'cap_count':0}
#         form_dict[form.lower()]['count'] += 1
#         if form[0].isupper() and len(form)>1 and form[1].islower():
#             form_dict[form.lower()]['cap_count'] += 1

# fptr.close()

with open('./vocab_ro/noun_lemmas.txt', 'r', encoding='utf-8') as handle:
    noun_lemmas = handle.readlines()

noun_lemmas = [n.strip() for n in noun_lemmas if n.strip()]

ro_form_gen.initialize('filter_cls5.v1.0.json')

args = list(itertools.product((0,1), repeat=3))

form_dict = {}


for lemma in noun_lemmas:
    form_dict[lemma] = {Number.SG:{g:0 for g in Gender}, Number.PL:{g:0 for g in Gender}}
    for k in args:
        nr = 'Sing' if k[0] else 'Plur'
        definite = bool(k[1])
        case_dir = not bool(k[2])
        form = ro_form_gen.get_noun_form(lemma, nr, definite, case_dir)
        form_dict[lemma][k] = form
        form_info = [d for d in ro_form_gen.get_noun_info(form) if d['lemma']==lemma and d['category']=='N' and d['Type']=='Common']
        for m in form_info:
            num, gen = m.get('Number'), m.get('Gender')
            if num and gen:
                form_dict[lemma][num][gen] += 1
    genders = {k:None for k in Number}
    for num in Number:
        counts = form_dict[lemma][num]
        if counts[Gender.MASC] > 0 and counts[Gender.FEM] == 0:
            genders[num] = Gender.MASC
        elif counts[Gender.MASC] == 0 and counts[Gender.FEM] > 0:
            genders[num] = Gender.FEM
    if None in genders.values() or genders[Number.SG] == Gender.FEM and genders[Number.PL] == Gender.MASC:
        form_dict[lemma]['Gender'] = None
    elif genders[Number.SG] == genders[Number.PL]:
        form_dict[lemma]['Gender'] = genders[Number.SG].value
    else:
        form_dict[lemma]['Gender'] = 'NEUTR'
    if lemma=='femeie':
        break

