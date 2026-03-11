
import re
from collections import Counter, defaultdict

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

