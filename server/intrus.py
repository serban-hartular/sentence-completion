from sequences import QuestionData, QuestionSequenceFactory

class EliminaIntrusul(QuestionSequenceFactory):
    CLASS_NAME='RO: Elimină intrusul'
    COLOR='#11aa11'
    SCREEN_KIND='mark_words'

    outputs = [
        dict(prompt='Taie intrusul din următoarele:', words=['unu', 'doi', 'pesmet'],
                    markStyle='cross', allowMultiple=False, layout='row',
                    correctMarked=['pesmet']),
        dict(prompt='Încercuiește intrusul din următoarele:', words=['unu', 'doi', 'pesmet'],
                    markStyle='circle', allowMultiple=False, layout='row',
                    correctMarked=['pesmet']),
        dict(prompt='Subliniază intrusul din următoarele:', words=['unu', 'doi', 'pesmet'],
                    markStyle='underline', allowMultiple=False, layout='row',
                    correctMarked=['pesmet']),
        dict(prompt='Taie intrusul din următoarele:', words=['unu', 'doi', 'pesmet'],
                    markStyle='cross', allowMultiple=True, layout='row',
                    correctMarked=['pesmet']),
    
    ]

    def __init__(self, num_q = 0) -> None:
        self.count = -1
        self.num_q = num_q if num_q else len(EliminaIntrusul.outputs)

    def get_next_question(self, previous_was_good: bool = True) -> dict | None:
        if previous_was_good:
            self.count += 1
        if self.count >= self.num_q:
            return None
#   prompt: string;
#   words: string[];

#   markStyle: MarkStyle;          // "circle" | "cross" | "underline"
#   allowMultiple: boolean;        // multi-select vs single-select
#   layout: WordsLayoutMode;       // "row" | "paragraph"

#   // Optional: allow frontend to compute success
#   correctMarked?: string[];

#   // Optional: prefills (should be silent)
#   initialMarked?: string[];
        return self.outputs[self.count]