package router

import (
	"container/list"
	"sync"
)

type item struct {
	key              string
	value            any
	element          *list.Element
	neverMoveToFront bool
}

type cache struct {
	mu       sync.RWMutex
	items    map[string]*item
	order    *list.List
	maxItems int
}

func NewLRUCache(maxItems int) *cache {
	return &cache{
		items:    make(map[string]*item),
		order:    list.New(),
		maxItems: maxItems,
	}
}

func (c *cache) Get(key string) (any, bool) {
	c.mu.RLock()
	itm, found := c.items[key]
	c.mu.RUnlock()
	if !found {
		return nil, false
	}

	if !itm.neverMoveToFront {
		c.mu.Lock()
		c.order.MoveToFront(itm.element)
		c.mu.Unlock()
	}

	return itm.value, true
}

func (c *cache) Set(key string, value any, neverMoveToFront bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if itm, found := c.items[key]; found {
		if !itm.neverMoveToFront {
			c.order.MoveToFront(itm.element)
			itm.value = value
			itm.neverMoveToFront = neverMoveToFront
		}
		return
	}

	if c.order.Len() > c.maxItems {
		c.evict()
	}

	itm := &item{key: key, value: value, neverMoveToFront: neverMoveToFront}
	element := c.order.PushFront(itm)
	itm.element = element
	c.items[key] = itm
}

func (c *cache) evict() {
	back := c.order.Back()
	if back != nil {
		itm := back.Value.(*item)
		delete(c.items, itm.key)
		c.order.Remove(back)
	}
}
