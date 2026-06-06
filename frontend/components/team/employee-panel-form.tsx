import { EmployeeForm } from '@/components/team/employee-form';
import { SlidePanel } from '@/components/ui/slide-panel';
import { t } from '@/i18n';
import type { Employee } from '@/types/types';

type EmployeePanelFormProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
    employee?: Employee;
};

export function EmployeePanelForm({ visible, onClose, onExited, employee }: EmployeePanelFormProps) {
    return (
        <SlidePanel
            visible={visible}
            onClose={onClose}
            onExited={onExited}
            title={employee ? employee.name : t('accounts.employees.add')}
            icon="person-outline"
        >
            <EmployeeForm employee={employee} onClose={onClose} />
        </SlidePanel>
    );
}
