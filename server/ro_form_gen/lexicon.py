from __future__ import annotations

import dataclasses
import json
from collections import defaultdict
from typing import Generator, Callable

def xpos_tag_matches(xpos : str, other : str) -> int:
    match_count = 0
    for c1, c2 in zip(xpos, other):
        if c1 == c2 and c1 != '-':
            match_count += 1
        elif c1 == '-' or c2 == '-':
            match_count += 0
        else:
            return 0
    return match_count

@dataclasses.dataclass
class LexiconEntry:
    form : str
    lemma : str
    xpos : str
    is_neg : bool = False
    count : int = 0

    def __post_init__(self):
        match_len = 3
        prefix = 'ne'
        if self.form.startswith(prefix) and (not self.lemma.startswith(prefix) or
                    (self.form[len(prefix):len(prefix)+match_len] == self.lemma[:match_len])):
            self.is_neg = True
    def to_dict(self) -> dict:
        return dataclasses.asdict(self)
    @staticmethod
    def from_line(line : str) -> 'LexiconEntry':
        line = line.split('\t')
        form, lemma, xpos = line[:3]
        if lemma == '=':
            lemma = form
        if not all([form, lemma, xpos]):
            raise Exception(f'Empty entry in line {line}')
        return LexiconEntry(form, lemma, xpos)

LexiconFilterFn = Callable[[LexiconEntry, str], bool]


class Lexicon:
    def __init__(self, entries : list[LexiconEntry]):
        self.lemma_dict = defaultdict(lambda: defaultdict(list))
        self.form_dict = defaultdict(list)
        for e in entries:
            self.form_dict[e.form].append(e)
            self.lemma_dict[e.lemma][e.xpos].append(e)
        # to normal dicts
        self.form_dict = {k:v for k,v in self.form_dict.items()}
        self.lemma_dict = {l:{x:e for x,e in v.items()} for l,v in self.lemma_dict.items()}
        self.sort_lists()

    def sort_lists(self):
        for k,v in self.form_dict.items():
            v.sort(key=lambda e : -e.count)
        for l,v in self.lemma_dict.items():
            for x, e in v.items():
                e.sort(key=lambda e: -e.count)

    def add_count(self, form : str, lemma : str = None, xpos : str = None) -> bool:
        entries = self.form_dict.get(form)
        if not entries:
            return False
        if lemma:
            entries = [e for e in entries if e.lemma == lemma]
        if xpos:
            entries = [e for e in entries if e.xpos == xpos]
        if not entries:
            return False
        for e in entries:
            e.count += 1
        return True

    def iter_entries(self) -> Generator[LexiconEntry, None, None]:
        for form, e_list in self.form_dict.items():
            for e in e_list:
                yield e

    def to_dict_list(self) -> list[dict]:
        return [e.to_dict() for e in self.iter_entries()]

    def to_json(self, filename : str):
        with open(filename, 'w') as handle:
            json.dump(self.to_dict_list(), handle)

    @staticmethod
    def from_json(filename : str) -> 'Lexicon':
        with open(filename, 'r') as handle:
            ll = json.load(handle)
        return Lexicon([LexiconEntry(**e) for e in ll])

    @staticmethod
    def from_file(filename : str) -> 'Lexicon':
        ll = []
        with open(filename, 'r', encoding='utf-8') as handle:
            while True:
                line = handle.readline()
                if not line:
                    break
                ll.append(LexiconEntry.from_line(line))
        return Lexicon(ll)

    def lemma_xpos_to_form(self, lemma : str, search_tag : str,
                           filterFn: LexiconFilterFn = None) -> list[str] | None:
        if lemma not in self.lemma_dict:
            return None
        xpos_dict = self.lemma_dict[lemma]
        xpos_list = [(xpos, xpos_tag_matches(search_tag, xpos)) for xpos in xpos_dict.keys()]
        xpos_list = [(xpos, score) for (xpos, score) in xpos_list if score > 0]
        xpos_list.sort(key=lambda t: -t[1] + len(t[0])/100)
        entry_list = []
        for xpos, _ in xpos_list:
            entry_list.extend(xpos_dict[xpos])
        if filterFn is not None:
            entry_list = [e for e in entry_list if filterFn(e, search_tag)]
        return [e.form for e in entry_list]



