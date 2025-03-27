package jsonutil

import (
	"testing"
)

func TestToString(t *testing.T) {
	type testStruct struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// Test case: simple struct
	input := testStruct{Name: "Test", Value: 42}
	expected := `{"name":"Test","value":42}`
	result, err := ToString(input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != expected {
		t.Fatalf("expected %s, got %s", expected, result)
	}

	// Test case: empty struct
	inputEmpty := testStruct{}
	expectedEmpty := `{"name":"","value":0}`
	resultEmpty, err := ToString(inputEmpty)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resultEmpty != expectedEmpty {
		t.Fatalf("expected %s, got %s", expectedEmpty, resultEmpty)
	}

	// Test case: nil input
	var inputNil any
	expectedNil := "null"
	resultNil, err := ToString(inputNil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resultNil != expectedNil {
		t.Fatalf("expected %s, got %s", expectedNil, resultNil)
	}
}
