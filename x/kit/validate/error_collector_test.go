package validate

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
)

func TestAnyChecker(t *testing.T) {
	t.Run("Required", func(t *testing.T) {
		var i int
		if err := Any("int", i).Required().Error(); err == nil {
			t.Error("expected error for zero value")
		}

		i = 1
		if err := Any("int", i).Required().Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		var s *string
		if err := Any("string", s).Required().Error(); err == nil {
			t.Error("expected error for nil pointer")
		}

		str := "test"
		s = &str
		if err := Any("string", s).Required().Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("Optional", func(t *testing.T) {
		var i int
		if err := Any("int", i).Optional().Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		i = 1
		if err := Any("int", i).Optional().Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		var s *string
		if err := Any("string", s).Optional().Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		str := "test"
		s = &str
		if err := Any("string", s).Optional().Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestObjectChecker(t *testing.T) {
	t.Run("RequiredFields", func(t *testing.T) {
		type Person struct {
			Name    string
			Age     int
			Address *string
		}

		// All fields zero
		p := Person{}
		v := Object(&p)
		v.Required("Name")
		v.Required("Age")
		v.Required("Address")
		err := v.Error()

		if err == nil {
			t.Error("expected error for all zero fields")
		} else {
			if !strings.Contains(err.Error(), "Name is required") {
				t.Error("expected 'Name is required' error")
			}
			if !strings.Contains(err.Error(), "Age is required") {
				t.Error("expected 'Age is required' error")
			}
			if !strings.Contains(err.Error(), "Address is required") {
				t.Error("expected 'Address is required' error")
			}
		}

		// Filled fields
		addr := "123 Main St"
		p = Person{Name: "John", Age: 30, Address: &addr}
		v = Object(&p)
		v.Required("Name")
		v.Required("Age")
		v.Required("Address")
		err = v.Error()

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("OptionalFields", func(t *testing.T) {
		type Person struct {
			Name    string
			Age     int
			Address *string
		}

		// All fields zero
		p := Person{}
		v := Object(&p)
		v.Optional("Name")
		v.Optional("Age")
		v.Optional("Address")
		err := v.Error()

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// Mix of required and optional
		v = Object(&p)
		v.Required("Name")
		v.Optional("Age")
		v.Optional("Address")
		err = v.Error()

		if err == nil {
			t.Error("expected error for required zero field")
		} else {
			if !strings.Contains(err.Error(), "Name is required") {
				t.Error("expected 'Name is required' error")
			}
		}

		p.Name = "John"
		v = Object(&p)
		v.Required("Name")
		v.Optional("Age")
		v.Optional("Address")
		err = v.Error()

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("MapWithStringKeys", func(t *testing.T) {
		// Empty map
		m := map[string]any{}
		v := Object(m)
		v.Required("name")
		v.Required("age")
		err := v.Error()

		if err == nil {
			t.Error("expected error for missing map keys")
		} else {
			if !strings.Contains(err.Error(), "name is required") {
				t.Error("expected 'name is required' error")
			}
			if !strings.Contains(err.Error(), "age is required") {
				t.Error("expected 'age is required' error")
			}
		}

		// Filled map
		m = map[string]any{
			"name": "John",
			"age":  30,
		}
		v = Object(m)
		v.Required("name")
		v.Required("age")
		v.Optional("address")
		err = v.Error()

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("NestedStructs", func(t *testing.T) {
		type Address struct {
			Street string
			City   string
		}
		type Person struct {
			Name    string
			Address Address
		}

		p := Person{}
		v := Object(&p)
		v.Required("Name")
		v.Required("Address")
		err := v.Error()

		if err == nil {
			t.Error("expected error for zero name field")
		} else {
			if !strings.Contains(err.Error(), "Name is required") {
				t.Error("expected 'Name is required' error")
			}
		}

		p.Name = "John"
		v = Object(&p)
		v.Required("Name")
		v.Required("Address")
		err = v.Error()

		if err != nil {
			t.Errorf("unexpected error for Address: %v", err)
		}
	})
}

// Validator implementation tests
type User struct {
	Username string
	Password string
	Profile  Profile
}

func (u User) Validate() error {
	if len(u.Username) < 3 {
		return errors.New("username must be at least 3 characters")
	}
	if len(u.Password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

type Profile struct {
	Bio    string
	Email  string
	Status *Status
}

func (p Profile) Validate() error {
	if p.Email != "" && !strings.Contains(p.Email, "@") {
		return errors.New("invalid email format")
	}
	return nil
}

type Status struct {
	Active bool
}

func (s *Status) Validate() error {
	if s == nil {
		return errors.New("status cannot be nil")
	}
	return nil
}

func TestValidatorInterface(t *testing.T) {
	t.Run("DirectValidation", func(t *testing.T) {
		// Invalid user
		u := User{Username: "ab", Password: "short"}
		err := Any("user", u).Required().Error()
		if err == nil {
			t.Error("expected validation error")
		} else {
			if !strings.Contains(err.Error(), "username must be at least 3 characters") {
				t.Error("expected username validation error")
			}
		}

		// Invalid user due to nested field that implements Validator (Status)
		u = User{Username: "john", Password: "password123"}
		err = Any("user", u).Required().Error()
		if err == nil {
			t.Error("expected validation error")
		} else {
			if !strings.Contains(err.Error(), "status cannot be nil") {
				t.Error("expected status validation error")
			}
		}
	})

	t.Run("NestedValidation", func(t *testing.T) {
		// Invalid nested field
		u := User{
			Username: "john",
			Password: "password123",
			Profile: Profile{
				Email: "invalid-email",
			},
		}
		err := Any("user", u).Required().Error()
		if err == nil {
			t.Error("expected validation error")
		} else {
			if !strings.Contains(err.Error(), "invalid email format") {
				t.Error("expected email validation error")
			}
		}

		// Valid nested field (Status is truthy
		u.Profile.Email = "john@example.com"
		u.Profile.Status = &Status{Active: true}
		err = Any("user", u).Required().Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("PointerValidation", func(t *testing.T) {
		// Missing required pointer field
		u := User{
			Username: "john",
			Password: "password123",
			Profile: Profile{
				Email:  "john@example.com",
				Status: nil,
			},
		}
		err := Any("user", u).Required().Error()
		if err == nil {
			t.Error("expected validation error for nil Status")
		}

		// Valid pointer field
		status := Status{Active: true}
		u.Profile.Status = &status
		err = Any("user", u).Required().Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

// Complex nested structures tests
type Company struct {
	Name      string
	Employees map[string]*Employee
	Offices   []Office
	Config    *Config
}

type Employee struct {
	ID   int
	Name string
	Tags []string
}

type Office struct {
	Location string
	Capacity int
}

type Config struct {
	Settings map[string]any
}

func (c *Company) Validate() error {
	if c.Name == "" {
		return errors.New("company name is required")
	}
	return nil
}

func (e *Employee) Validate() error {
	if e.ID <= 0 {
		return errors.New("employee ID must be positive")
	}
	if e.Name == "" {
		return errors.New("employee name is required")
	}
	return nil
}

func TestComplexNestedStructures(t *testing.T) {
	t.Run("MapOfPointersValidation", func(t *testing.T) {
		// Invalid employee
		company := Company{
			Name: "Acme Corp",
			Employees: map[string]*Employee{
				"emp1": {ID: 0, Name: ""}, // Invalid employee
			},
		}
		err := Any("company", &company).Required().Error()
		if err == nil {
			t.Error("expected validation error")
		} else {
			if !strings.Contains(err.Error(), "employee ID must be positive") {
				t.Error("expected employee ID validation error")
			}
		}

		// Valid structure
		company.Employees["emp1"].ID = 1
		company.Employees["emp1"].Name = "John"
		err = Any("company", &company).Required().Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("SliceValidation", func(t *testing.T) {
		company := Company{
			Name: "Acme Corp",
			Employees: map[string]*Employee{
				"emp1": {ID: 1, Name: "John"},
			},
			Offices: []Office{
				{Location: "", Capacity: 0}, // We don't have validation for this yet
			},
		}
		err := Any("company", &company).Required().Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// Test with Object checker for specific office validation
		v := Object(&company)
		v.Required("Name")
		v.Optional("Employees")
		v.Optional("Offices")
		err = v.Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("NilPointerInNestedStruct", func(t *testing.T) {
		// Config is nil but optional
		company := Company{
			Name:   "Acme Corp",
			Config: nil,
		}
		v := Object(&company)
		v.Required("Name")
		v.Optional("Config")
		err := v.Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// Config is nil but required
		v = Object(&company)
		v.Required("Name")
		v.Required("Config")
		err = v.Error()
		if err == nil {
			t.Error("expected error for nil Config")
		} else {
			if !strings.Contains(err.Error(), "Config is required") {
				t.Error("expected 'Config is required' error")
			}
		}
	})
}

// Test safeDereference and getObjectState
func TestSafeDereference(t *testing.T) {
	str := "test"
	ptrValue := reflect.ValueOf(&str)
	derefValue := safeDereference(ptrValue)

	if derefValue.Kind() != reflect.String {
		t.Errorf("expected string, got %v", derefValue.Kind())
	}

	nonPtrValue := reflect.ValueOf(str)
	derefValue = safeDereference(nonPtrValue)

	if derefValue.Kind() != reflect.String {
		t.Errorf("expected string, got %v", derefValue.Kind())
	}
}

// Test field group constraints
func TestFieldGroupConstraint(t *testing.T) {
	type TestForm struct {
		Email    string
		Phone    string
		Username string
	}

	// Create a custom constraint function for testing
	requireAtLeastOne := func(truthyCount, totalFields int) string {
		if truthyCount == 0 {
			return "at least one of %s fields is required"
		}
		return ""
	}

	requireExactlyOne := func(truthyCount, totalFields int) string {
		if truthyCount != 1 {
			return "exactly one of %s fields is required"
		}
		return ""
	}

	requireAll := func(truthyCount, totalFields int) string {
		if truthyCount != totalFields {
			return "all %s fields are required"
		}
		return ""
	}

	t.Run("RequireAtLeastOne", func(t *testing.T) {
		// No fields provided
		form := TestForm{}
		oc := Object(&form)
		oc = oc.validateFieldGroupConstraint("contact", []string{"Email", "Phone"}, requireAtLeastOne)
		if err := oc.Error(); err == nil {
			t.Error("expected error when no fields provided")
		} else if !strings.Contains(err.Error(), "at least one of contact fields is required") {
			t.Errorf("unexpected error: %v", err)
		}

		// One field provided
		form.Email = "test@example.com"
		oc = Object(&form)
		oc = oc.validateFieldGroupConstraint("contact", []string{"Email", "Phone"}, requireAtLeastOne)
		if err := oc.Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("RequireExactlyOne", func(t *testing.T) {
		// No fields provided
		form := TestForm{}
		oc := Object(&form)
		oc = oc.validateFieldGroupConstraint("identifier", []string{"Email", "Phone", "Username"}, requireExactlyOne)
		if err := oc.Error(); err == nil {
			t.Error("expected error when no fields provided")
		}

		// One field provided
		form.Email = "test@example.com"
		oc = Object(&form)
		oc = oc.validateFieldGroupConstraint("identifier", []string{"Email", "Phone", "Username"}, requireExactlyOne)
		if err := oc.Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// Multiple fields provided
		form.Phone = "555-1234"
		oc = Object(&form)
		oc = oc.validateFieldGroupConstraint("identifier", []string{"Email", "Phone", "Username"}, requireExactlyOne)
		if err := oc.Error(); err == nil {
			t.Error("expected error when multiple fields provided")
		}
	})

	t.Run("RequireAll", func(t *testing.T) {
		// No fields provided
		form := TestForm{}
		oc := Object(&form)
		oc = oc.validateFieldGroupConstraint("user info", []string{"Email", "Phone", "Username"}, requireAll)
		if err := oc.Error(); err == nil {
			t.Error("expected error when no fields provided")
		}

		// Some fields provided
		form.Email = "test@example.com"
		form.Phone = "555-1234"
		oc = Object(&form)
		oc = oc.validateFieldGroupConstraint("user info", []string{"Email", "Phone", "Username"}, requireAll)
		if err := oc.Error(); err == nil {
			t.Error("expected error when not all fields provided")
		}

		// All fields provided
		form.Username = "testuser"
		oc = Object(&form)
		oc = oc.validateFieldGroupConstraint("user info", []string{"Email", "Phone", "Username"}, requireAll)
		if err := oc.Error(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

// Test edge cases
func TestECEdgeCases(t *testing.T) {
	t.Run("EmptyMap", func(t *testing.T) {
		m := map[string]any{}
		err := Object(m).Error()
		if err != nil {
			t.Errorf("unexpected error for empty map: %v", err)
		}
	})

	t.Run("NilMap", func(t *testing.T) {
		var m map[string]any
		err := Object(m).Error()
		if err != nil {
			t.Errorf("unexpected error for nil map: %v", err)
		}
	})

	t.Run("InvalidObject", func(t *testing.T) {
		err := Object(42).Error()
		if err == nil {
			t.Error("expected error for invalid object")
		}
	})

	t.Run("RecursiveNesting", func(t *testing.T) {
		type Node struct {
			Value    string
			Children []*Node
		}

		// Create a simple tree
		leaf1 := &Node{Value: "Leaf 1"}
		leaf2 := &Node{Value: "Leaf 2"}
		root := &Node{
			Value:    "Root",
			Children: []*Node{leaf1, leaf2},
		}

		err := Any("node", root).Required().Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// Add a nil child
		root.Children = append(root.Children, nil)
		err = Any("node", root).Required().Error()
		if err != nil {
			t.Errorf("unexpected error with nil child: %v", err)
		}

		// Empty value in non-nil child
		leaf1.Value = ""
		v := Object(root)
		v.Required("Value")
		v.Optional("Children")
		err = v.Error()
		if err != nil {
			t.Errorf("unexpected error for empty but non-required child field: %v", err)
		}
	})
}

// Test custom validators
type CustomValidator struct {
	Value       string
	MinLength   int
	MaxLength   int
	CustomError string
}

func (cv CustomValidator) Validate() error {
	if len(cv.Value) < cv.MinLength {
		return fmt.Errorf("minimum length is %d", cv.MinLength)
	}
	if cv.MaxLength > 0 && len(cv.Value) > cv.MaxLength {
		return fmt.Errorf("maximum length is %d", cv.MaxLength)
	}
	if cv.CustomError != "" {
		return errors.New(cv.CustomError)
	}
	return nil
}

func TestCustomValidators(t *testing.T) {
	t.Run("TooShort", func(t *testing.T) {
		cv := CustomValidator{
			Value:     "ab",
			MinLength: 3,
		}
		err := Any("custom", cv).Required().Error()
		if err == nil {
			t.Error("expected validation error for too short")
		} else {
			if !strings.Contains(err.Error(), "minimum length is 3") {
				t.Error("expected 'minimum length is 3' error")
			}
		}
	})

	t.Run("TooLong", func(t *testing.T) {
		cv := CustomValidator{
			Value:     "abcdefg",
			MinLength: 3,
			MaxLength: 5,
		}
		err := Any("custom", cv).Required().Error()
		if err == nil {
			t.Error("expected validation error for too long")
		} else {
			if !strings.Contains(err.Error(), "maximum length is 5") {
				t.Error("expected 'maximum length is 5' error")
			}
		}
	})

	t.Run("CustomError", func(t *testing.T) {
		cv := CustomValidator{
			Value:       "abcde",
			MinLength:   3,
			MaxLength:   10,
			CustomError: "this is a custom error",
		}
		err := Any("custom", cv).Required().Error()
		if err == nil {
			t.Error("expected validation error for custom error")
		} else {
			if !strings.Contains(err.Error(), "this is a custom error") {
				t.Error("expected custom error message")
			}
		}
	})

	t.Run("Valid", func(t *testing.T) {
		cv := CustomValidator{
			Value:     "abcde",
			MinLength: 3,
			MaxLength: 10,
		}
		err := Any("custom", cv).Required().Error()
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestValidationError(t *testing.T) {
	t.Run("IsValidationError", func(t *testing.T) {
		// Test direct validation error
		user := User{Username: "ab", Password: "short"}
		err := Any("user", user).Required().Error()

		if err == nil {
			t.Fatal("expected validation error")
		}

		if !IsValidationError(err) {
			t.Error("expected err to be a ValidationError")
		}

		// Test wrapped validation error
		wrappedErr := fmt.Errorf("wrapped: %w", err)
		if !IsValidationError(wrappedErr) {
			t.Error("expected wrapped err to be detected as ValidationError")
		}

		// Test non-validation error
		regularErr := errors.New("regular error")
		if IsValidationError(regularErr) {
			t.Error("non-validation error incorrectly identified as ValidationError")
		}
	})

	t.Run("ValidationErrorWrapping", func(t *testing.T) {
		// Ensure validation error preserves original message
		user := User{Username: "ab", Password: "short"}
		err := Any("user", user).Required().Error()

		if err == nil {
			t.Fatal("expected validation error")
		}

		originalMsg := err.Error()
		if !strings.Contains(originalMsg, "username must be at least 3 characters") {
			t.Error("validation error should contain original error message")
		}
	})
}
