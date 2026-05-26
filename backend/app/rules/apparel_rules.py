from business_rules import run_all
from business_rules.actions import BaseActions, rule_action
from business_rules.fields import FIELD_TEXT
from business_rules.variables import BaseVariables, string_rule_variable, boolean_rule_variable

class AttributeVariables(BaseVariables):
    def __init__(self, attribute_mapping):
        self.attribute_mapping = attribute_mapping

    @string_rule_variable()
    def internal_attribute(self):
        return self.attribute_mapping.get('internal_attribute', '')

    @string_rule_variable()
    def category(self):
        return self.attribute_mapping.get('category', 'All')

    @boolean_rule_variable()
    def is_mandatory(self):
        return self.attribute_mapping.get('mandatory', False)

class AttributeActions(BaseActions):
    def __init__(self, attribute_mapping):
        self.attribute_mapping = attribute_mapping
        self.warnings = []

    @rule_action(params={"message": FIELD_TEXT})
    def add_warning(self, message):
        self.warnings.append(message)

def validate_mapping(mapping_data):
    # Example rules
    rules = [
        {
            "conditions": {
                "all": [
                    {"name": "category", "operator": "equal_to", "value": "Apparel"},
                    {"name": "internal_attribute", "operator": "equal_to", "value": "fabric_composition"}
                ]
            },
            "actions": [
                {"name": "add_warning", "params": {"message": "Fabric composition is mandatory for apparel category."}}
            ]
        }
    ]

    variables = AttributeVariables(mapping_data)
    actions = AttributeActions(mapping_data)

    run_all(rule_list=rules,
            defined_variables=variables,
            defined_actions=actions,
            stop_on_first_trigger=False)

    return actions.warnings
