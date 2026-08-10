# PlayFret

> If it isn't fun, rewrite it.

Mobile-first guitar learning application.

## Lesson Engine

`LessonEngine` is a dependency-free timeline reader. It accepts either a lesson
object or a JSON URL, separates its metadata from its events, and sorts the
timeline once at load time. A numeric cursor makes event iteration constant-time
and `reset()` rewinds that cursor without repeating any parsing or sorting.

```js
const engine = new PlayFret.LessonEngine();
await engine.load("lessons/smoke-on-the-water.json");

const lesson = engine.getInfo();
const orderedEvents = engine.getEvents();
const firstEvent = engine.getNextEvent();
engine.reset();
```

### Lesson data

```text
lessons/
└── smoke-on-the-water.json
```

Every event requires a non-negative `timeMs`. Events with the same timestamp
keep their original JSON order.
