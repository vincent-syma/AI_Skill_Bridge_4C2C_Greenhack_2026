.DEFAULT_GOAL := help

.PHONY: help backend

help: ## Show repo-level targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make [target]\n\nTargets:\n"} \
	/^[a-zA-Z0-9_-]+:.*##/ { printf "  %-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Backend targets: cd backend && make help"

backend: ## Run backend Makefile (pass TARGET=..., e.g. make backend TARGET=stack)
	$(MAKE) -C backend $(TARGET)
