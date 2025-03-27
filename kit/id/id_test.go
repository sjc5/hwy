package id

import (
	"strings"
	"testing"
)

func TestIDNew(t *testing.T) {
	for i := 0; i <= 255; i++ {
		id, err := New(uint8(i))

		// ensure no error
		if err != nil {
			t.Errorf("New() returned error: %v", err)
			continue
		}

		// ensure correct length
		if len(id) != i {
			t.Errorf("New() returned ID of length %d, expected %d", len(id), i)
			continue
		}

		// ensure no invalid characters
		if strings.ContainsAny(id, "-_+/=") {
			t.Errorf("New() returned ID with invalid characters: %s", id)
		}
	}
}

func TestIDNewEdgeCases(t *testing.T) {
	// Test with idLen = 0
	id, err := New(0)
	if err != nil {
		t.Errorf("New(0) returned error: %v", err)
	}
	if id != "" {
		t.Errorf("New(0) returned non-empty ID: %s", id)
	}

	// Test with idLen = 255
	id, err = New(255)
	if err != nil {
		t.Errorf("New(255) returned error: %v", err)
	}
	if len(id) != 255 {
		t.Errorf("New(255) returned ID of length %d, expected 255", len(id))
	}
}

func TestNewMulti(t *testing.T) {
	// Test with count = 0
	ids, err := NewMulti(10, 0)
	if err != nil {
		t.Errorf("NewMulti(10, 0) returned error: %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("NewMulti(10, 0) returned non-empty slice: %v", ids)
	}

	// Test with valid idLen and count
	ids, err = NewMulti(10, 5)
	if err != nil {
		t.Errorf("NewMulti(10, 5) returned error: %v", err)
	}
	if len(ids) != 5 {
		t.Errorf("NewMulti(10, 5) returned slice of length %d, expected 5", len(ids))
	}
	for _, id := range ids {
		if len(id) != 10 {
			t.Errorf("NewMulti() returned ID of length %d, expected 10", len(id))
		}
	}
}

func TestIDRandomness(t *testing.T) {
	// Test for randomness
	id1, _ := New(10)
	id2, _ := New(10)
	if id1 == id2 {
		t.Errorf("New() returned identical IDs: %s and %s", id1, id2)
	}
}
