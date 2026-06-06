import { UserForm } from '@/components/team/user-form';
import { SlidePanel } from '@/components/ui/slide-panel';
import { t } from '@/i18n';
import type { ManagedUser } from '@/types/auth';

type UserPanelFormProps = {
    visible: boolean;
    onClose: () => void;
    onExited: () => void;
    editingUser?: ManagedUser;
};

export function UserPanelForm({ visible, onClose, onExited, editingUser }: UserPanelFormProps) {
    return (
        <SlidePanel
            visible={visible}
            onClose={onClose}
            onExited={onExited}
            title={editingUser ? t('setup.account.editTitle') : t('setup.account.add')}
            icon="person-outline"
        >
            <UserForm editingUser={editingUser} onClose={onClose} />
        </SlidePanel>
    );
}
