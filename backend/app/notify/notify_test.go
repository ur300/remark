package notify

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/umputun/remark/backend/app/store"
)

func TestService_NoDestinations(t *testing.T) {
	s := NewService(nil, 1)
	assert.NotNil(t, s)
	s.Submit(store.Comment{ID: "123"})
	s.Submit(store.Comment{ID: "123"})
	s.Submit(store.Comment{ID: "123"})
	s.Close()
}

func TestService_WithDestinations(t *testing.T) {
	d1, d2 := &mockDest{id: 1}, &mockDest{id: 2}
	s := NewService(nil, 1, d1, d2)
	assert.NotNil(t, s)

	s.Submit(store.Comment{ID: "100"})
	time.Sleep(time.Millisecond * 110)
	s.Submit(store.Comment{ID: "101"})
	time.Sleep(time.Millisecond * 110)
	s.Submit(store.Comment{ID: "102"})
	time.Sleep(time.Millisecond * 110)
	s.Close()

	assert.Equal(t, 3, len(d1.get()), "got all comments to d1")
	assert.Equal(t, 3, len(d2.get()), "got all comments to d2")

	assert.Equal(t, "100", d1.get()[0].ID)
	assert.Equal(t, "101", d1.get()[1].ID)
	assert.Equal(t, "102", d1.get()[2].ID)
}

func TestService_WithDrops(t *testing.T) {
	d1, d2 := &mockDest{id: 1}, &mockDest{id: 2}
	s := NewService(nil, 1, d1, d2)
	assert.NotNil(t, s)

	s.Submit(store.Comment{ID: "100"})
	s.Submit(store.Comment{ID: "101"})
	time.Sleep(time.Millisecond * 110)
	s.Submit(store.Comment{ID: "102"})
	time.Sleep(time.Millisecond * 110)
	s.Close()

	s.Submit(store.Comment{ID: "111"}) // safe to send after close

	assert.Equal(t, 2, len(d1.get()), "one comment dropped from d1")
	assert.Equal(t, 2, len(d2.get()), "one comment dropped from d2")
}

func TestService_Many(t *testing.T) {
	d1, d2 := &mockDest{id: 1}, &mockDest{id: 2}
	s := NewService(nil, 5, d1, d2)
	assert.NotNil(t, s)

	for i := 0; i < 10; i++ {
		s.Submit(store.Comment{ID: fmt.Sprintf("%d", 100+i)})
		time.Sleep(time.Millisecond * time.Duration(rand.Int31n(200)))
	}
	s.Close()
	time.Sleep(time.Millisecond * 10)

	assert.NotEqual(t, 10, len(d1.get()), "some comments dropped from d1")
	assert.NotEqual(t, 10, len(d2.get()), "some comments dropped from d2")

	assert.True(t, d1.closed)
	assert.True(t, d2.closed)
}

func TestService_Nop(t *testing.T) {
	s := NopService
	s.Submit(store.Comment{})
	s.Close()
	assert.True(t, s.closed)
}

type mockDest struct {
	data   []store.Comment
	id     int
	closed bool
	lock   sync.Mutex
}

func (m *mockDest) Send(ctx context.Context, r request) error {
	m.lock.Lock()
	defer m.lock.Unlock()
	select {
	case <-time.After(100 * time.Millisecond):
		m.data = append(m.data, r.comment)
		log.Printf("sent %s -> %d", r.comment.ID, m.id)
	case <-ctx.Done():
		log.Printf("ctx closed %d", m.id)
		m.closed = true
	}
	return nil
}

func (m *mockDest) get() []store.Comment {
	m.lock.Lock()
	defer m.lock.Unlock()
	res := make([]store.Comment, len(m.data))
	copy(res, m.data)
	return res
}
func (m *mockDest) String() string { return fmt.Sprintf("mock id=%d, closed=%v", m.id, m.closed) }
