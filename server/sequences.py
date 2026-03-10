import dataclasses
from typing import Callable


@dataclasses.dataclass
class QuestionData:
    prompt: str
    slots: list[str]
    bankWords: list[str]
    correct: list[str]
    initialMovable: bool = False

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)
    

class QuestionSequenceFactory:
    CLASS_NAME = ''
    SCREEN_KIND = 'sentence'
    COLOR = '#555555'

    def __init__(self, **kwargs) -> None:
        pass
    
    def get_screen_kind(self) -> str:
        return self.__class__.SCREEN_KIND
    
    def get_sequence_name(self) -> str:
        return self.__class__.CLASS_NAME
    def get_color(self) -> str:
        return self.__class__.COLOR
    
    def get_next_question(self, previous_was_good : bool = True) -> dict|None:
        pass
    def get_pronounciations(self) -> dict:
        return {}
    def get_images(self) -> dict:
        return {}

@dataclasses.dataclass
class SequenceFactoryRecord:
    factory : Callable[[], QuestionSequenceFactory]
    color : str = ''
    sequence_name : str = ''
    screen_kind : str = ''
    kwargs : dict = dataclasses.field(default_factory=dict)

    def __post_init__(self):
        dummy = self.get_sequence_factory()
        if not self.color:
            self.color = dummy.get_color()
        if not self.sequence_name:
            self.sequence_name = dummy.get_sequence_name()
        if not self.screen_kind:
            self.screen_kind = dummy.get_screen_kind()

    def get_sequence_factory(self):
        return self.factory(**self.kwargs)

