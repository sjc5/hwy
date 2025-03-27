package kiruna

import (
	"flag"
	"fmt"

	"github.com/sjc5/river/kit/executil"
	"github.com/sjc5/river/kit/fsutil"
	"github.com/sjc5/river/kit/tsgen"
)

type BuildHelper struct {
	Kiruna        *Kiruna    // REQUIRED
	DevConfig     *DevConfig // REQUIRED
	FilesToVendor [][2]string
	GenHook       func(MutateStatements) error
	BuildHook     func(isDev bool) error
}

func (inst *BuildHelper) Dev() {
	SetModeToDev()
	inst.mustCommonBuild(true)
	inst.Kiruna.MustStartDev(inst.DevConfig)
}

func (inst *BuildHelper) ProdBuild() {
	inst.mustCommonBuild(false)

	if err := inst.Kiruna.Build(); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: ProdBuild: %w", err))
	}
}

func (inst *BuildHelper) ProdBuildNonGo() {
	inst.mustCommonBuild(false)

	if err := inst.Kiruna.BuildWithoutCompilingGo(); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: ProdBuildNonGo: %w", err))
	}
}

func (inst *BuildHelper) Gen(isDev bool) {
	if isDev {
		SetModeToDev()
	}
	if inst.GenHook == nil {
		panic("kiruna: buildhelper: GenHook is nil")
	}
	if err := inst.GenHook(inst.mutateStatements); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: Gen: %w", err))
	}
}

func (inst *BuildHelper) mustCommonBuild(isDev bool) {
	if err := vendorFiles(inst.FilesToVendor); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: mustCommonBuild: %w", err))
	}

	if inst.GenHook != nil {
		// Must run once at beginning so that it exists when the ts gen step happens.
		// This is because the gen step relies on the base Kiruna build output in order
		// to call GetPublicFileMapKeysBuildtime().
		if err := inst.Kiruna.BuildWithoutCompilingGo(); err != nil {
			panic(fmt.Errorf("kiruna: buildhelper: mustCommonBuild: %w", err))
		}

		inst.Gen(isDev)
	}

	if inst.BuildHook != nil {
		if err := inst.BuildHook(isDev); err != nil {
			panic(fmt.Errorf("kiruna: buildhelper: mustCommonBuild: %w", err))
		}
	}
}

// This should be used when you need to run the TS gen from
// inside an OnChangeCallback in your Kiruna.DevConfig. Why
// is this pattern necessary? Because TS is generated from
// within the dev server, and the dev server is instantiated
// only once, not every time you save a .go file. So, in
// order for the types to actually be re-evaluated, we need
// to run this file as a fresh script every time we save a
// .go file.
func TSGenOnChange(tasksPath string) error {
	return executil.MakeCmdRunner("go", "run", tasksPath, "-gen")()
}

const (
	flagDev            = "dev"
	flagProdBuild      = "prod-build"
	flagProdBuildNonGo = "prod-build-non-go"
	flagGen            = "gen"
)

func (inst *BuildHelper) Tasks() {
	devFlag := flag.Bool(flagDev, false, "Run Dev() function")
	buildFlag := flag.Bool(flagProdBuild, false, "Run ProdBuild() function")
	buildWithoutGoFlag := flag.Bool(flagProdBuildNonGo, false, "Run ProdBuildNonGo() function")
	genFlag := flag.Bool(flagGen, false, "Run Gen() function")

	flag.Parse()

	// Count how many flags are set to true
	flagCount := 0
	if *devFlag {
		flagCount++
	}
	if *buildFlag {
		flagCount++
	}
	if *buildWithoutGoFlag {
		flagCount++
	}
	if *genFlag {
		flagCount++
	}

	// Panic if no flags or multiple flags are set
	if flagCount != 1 {
		panic(fmt.Sprintf(
			"kiruna: buildhelper: Tasks: Must specify exactly one of the following flags: -%s, -%s, -%s, -%s",
			flagDev, flagProdBuild, flagProdBuildNonGo, flagGen,
		))
	}

	// Run the appropriate function based on the flag
	switch {
	case *devFlag:
		inst.Dev()
	case *buildFlag:
		inst.ProdBuild()
	case *buildWithoutGoFlag:
		inst.ProdBuildNonGo()
	case *genFlag:
		inst.Gen(false)
	}
}

// If you pass nil to this function, it will return a
// pointer to a new Statements object. If you pass a
// pointer to an existing Statements object, it will
// mutate that object and return it.
type MutateStatements func(statements *tsgen.Statements) *tsgen.Statements

func (inst *BuildHelper) mutateStatements(statements *tsgen.Statements) *tsgen.Statements {
	a := statements
	if a == nil {
		a = &tsgen.Statements{}
	}

	keys, err := inst.Kiruna.GetPublicFileMapKeysBuildtime()
	if err != nil {
		panic(err)
	}

	a.Serialize("const KIRUNA_PUBLIC_ASSETS", keys)
	a.Raw("export type KirunaPublicAsset", "`${\"/\" | \"\"}${(typeof KIRUNA_PUBLIC_ASSETS)[number]}`")

	return a
}

// vendorFiles takes a slice of src-dest tuples
func vendorFiles(filesToVendor [][2]string) error {
	for _, c := range filesToVendor {
		if err := fsutil.CopyFile(c[0], c[1]); err != nil {
			return err
		}
	}

	return nil
}
