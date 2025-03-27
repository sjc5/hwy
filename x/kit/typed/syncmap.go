package typed

import "sync"

type SyncMap[K comparable, V any] struct {
	m sync.Map
}

func (sm *SyncMap[K, V]) Load(key K) (value V, ok bool) {
	v, ok := sm.m.Load(key)
	if !ok {
		return value, false
	}
	return v.(V), true
}

func (sm *SyncMap[K, V]) Store(key K, value V) {
	sm.m.Store(key, value)
}

func (sm *SyncMap[K, V]) Delete(key K) {
	sm.m.Delete(key)
}

func (sm *SyncMap[K, V]) LoadOrStore(key K, value V) (actual V, loaded bool) {
	v, loaded := sm.m.LoadOrStore(key, value)
	return v.(V), loaded
}

func (sm *SyncMap[K, V]) LoadAndDelete(key K) (value V, loaded bool) {
	v, loaded := sm.m.LoadAndDelete(key)
	if !loaded {
		return value, false
	}
	return v.(V), loaded
}

func (sm *SyncMap[K, V]) Range(f func(key K, value V) bool) {
	sm.m.Range(func(key, value any) bool {
		return f(key.(K), value.(V))
	})
}
