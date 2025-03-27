package validate

import (
	"errors"
	"strings"
	"testing"
)

// MapKeyValidator implements Validator interface for map keys
type MapKeyValidator string

func (k MapKeyValidator) Validate() error {
	if strings.Contains(string(k), " ") {
		return errors.New("key cannot contain spaces")
	}
	return nil
}

// MapValueValidator implements Validator interface for map values
type MapValueValidator struct {
	Name string
}

func (v MapValueValidator) Validate() error {
	if v.Name == "" {
		return errors.New("name cannot be empty")
	}
	return nil
}

func TestMapKeyValidation(t *testing.T) {
	t.Run("MapKeyValidation", func(t *testing.T) {
		// Map with keys that implement Validator
		m := map[MapKeyValidator]string{
			"valid_key":     "value1",
			"invalid key":   "value2", // Contains a space, should fail validation
			"another_valid": "value3",
		}

		err := Any("map", m).Required().Error()
		if err == nil {
			t.Error("expected validation error for invalid map key")
		} else if !strings.Contains(err.Error(), "key cannot contain spaces") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	t.Run("MapKeyAndValueValidation", func(t *testing.T) {
		// Both keys and values implement Validator
		m := map[MapKeyValidator]MapValueValidator{
			"valid_key":   {"John"},
			"another_key": {""}, // Empty name, should fail
		}

		err := Any("map", m).Required().Error()
		if err == nil {
			t.Error("expected validation error for invalid map value")
		} else if !strings.Contains(err.Error(), "name cannot be empty") {
			t.Errorf("unexpected error message: %v", err)
		}

		// Add an invalid key
		m["invalid key"] = MapValueValidator{"Alice"}

		err = Any("map", m).Required().Error()
		if err == nil {
			t.Error("expected validation errors for both key and value")
		} else {
			if !strings.Contains(err.Error(), "key cannot contain spaces") {
				t.Error("expected 'key cannot contain spaces' error")
			}
			if !strings.Contains(err.Error(), "name cannot be empty") {
				t.Error("expected 'name cannot be empty' error")
			}
		}
	})
}

// SliceValidator implements Validator for slice elements
type SliceValidator struct {
	ID   int
	Name string
}

func (sv SliceValidator) Validate() error {
	if sv.ID <= 0 {
		return errors.New("ID must be positive")
	}
	if sv.Name == "" {
		return errors.New("name cannot be empty")
	}
	return nil
}

func TestSliceAndArrayValidation(t *testing.T) {
	t.Run("SliceElementValidation", func(t *testing.T) {
		// Slice with elements that implement Validator
		s := []SliceValidator{
			{1, "First"},
			{0, "Second"}, // Invalid ID
			{3, ""},       // Invalid name
		}

		err := Any("slice", s).Required().Error()
		if err == nil {
			t.Error("expected validation errors for slice elements")
		} else {
			if !strings.Contains(err.Error(), "slice[1]: ID must be positive") {
				t.Errorf("missing error for element 1: %v", err)
			}
			if !strings.Contains(err.Error(), "slice[2]: name cannot be empty") {
				t.Errorf("missing error for element 2: %v", err)
			}
		}
	})

	t.Run("ArrayElementValidation", func(t *testing.T) {
		// Array with elements that implement Validator
		a := [3]SliceValidator{
			{1, "First"},
			{2, "Second"},
			{0, ""}, // Both ID and name invalid
		}

		err := Any("array", a).Required().Error()
		if err == nil {
			t.Error("expected validation errors for array elements")
		} else {
			if !strings.Contains(err.Error(), "array[2]: ID must be positive") {
				t.Errorf("missing ID error for element 2: %v", err)
			}
		}
	})

	t.Run("NestedSliceValidation", func(t *testing.T) {
		// Struct with nested slice that has elements implementing Validator
		type Container struct {
			Name     string
			Elements []SliceValidator
		}

		c := Container{
			Name: "Container",
			Elements: []SliceValidator{
				{1, "First"},
				{0, "Second"}, // Invalid
			},
		}

		err := Any("container", c).Required().Error()
		if err == nil {
			t.Error("expected validation errors for nested slice elements")
		} else if !strings.Contains(err.Error(), "Elements[1]: ID must be positive") {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

// Complex structure to test error accumulation
type ComplexStructure struct {
	Name      string
	Records   map[MapKeyValidator]SliceValidator
	Items     []SliceValidator
	SubStruct SubStructValidator
}

type SubStructValidator struct {
	Field string
}

func (s SubStructValidator) Validate() error {
	if s.Field == "" {
		return errors.New("field cannot be empty")
	}
	return nil
}

func TestValidatorChaining(t *testing.T) {
	t.Run("MultipleValidationChain", func(t *testing.T) {
		// Test chaining multiple validations (should keep the first result)
		var s *string = nil

		// Chain Required() then Optional() - should fail because of Required
		err := Any("string", s).Required().Optional().Error()
		if err == nil {
			t.Error("expected error for Required() even after chaining Optional()")
		} else if !strings.Contains(err.Error(), "string is required") {
			t.Errorf("unexpected error: %v", err)
		}

		// Chain Optional() then Required() - should not fail because of done flag
		err = Any("string", s).Optional().Required().Error()
		if err != nil {
			t.Errorf("unexpected error after Optional() and Required(): %v", err)
		}
	})

	t.Run("ChainAfterFailure", func(t *testing.T) {
		// Create an invalid ObjectChecker directly
		oc := &ObjectChecker{}
		oc.fail("preset error")

		// Chains should not execute further validation
		child := oc.Required("Field")
		if !child.done {
			t.Error("child checker should be marked as done when parent has failed")
		}

		err := oc.Error()
		if err == nil || !strings.Contains(err.Error(), "preset error") {
			t.Errorf("expected preset error to be preserved, got: %v", err)
		}
	})
}

// Test for proper labeling of errors in nested structures
func TestErrorLabeling(t *testing.T) {
	t.Run("NestedErrorLabels", func(t *testing.T) {
		// Define types with Validator implementation outside the test function
		l1 := createNestedValidatorStructs()

		err := Any("root", l1).Required().Error()
		if err == nil {
			t.Error("expected nested validation error")
		} else {
			errorMsg := err.Error()
			// The error should contain proper context
			if !strings.Contains(errorMsg, "root") {
				t.Errorf("error message doesn't contain root label: %v", errorMsg)
			}
			if !strings.Contains(errorMsg, "value is empty") {
				t.Errorf("error message doesn't contain original error: %v", errorMsg)
			}
		}
	})
}

// Types for nested error test
type TestLevel3 struct {
	Value string
}

func (l TestLevel3) Validate() error {
	if l.Value == "" {
		return errors.New("value is empty")
	}
	return nil
}

type TestLevel2 struct {
	Field TestLevel3
}

func (l TestLevel2) Validate() error {
	// The validation will happen automatically on Field
	return nil
}

type TestLevel1 struct {
	Nested TestLevel2
}

func createNestedValidatorStructs() TestLevel1 {
	return TestLevel1{
		Nested: TestLevel2{
			Field: TestLevel3{
				Value: "", // This will fail validation
			},
		},
	}
}
