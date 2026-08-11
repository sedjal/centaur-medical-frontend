import { defineComponent, onMounted } from 'vue';
import { useUserStore } from '../stores/user';

export default defineComponent({
  name: 'UsersView',
  setup() {
    const store = useUserStore();

    onMounted(() => {
      void store.fetchUsers();
    });

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Users</h1>
            <p>Manage hospital staff accounts and roles.</p>
          </div>
        </div>

        {store.error && <div class="alert alert-error">{store.error}</div>}

        <div class="card" style="padding:8px 0">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>MFA</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.first_name} {u.last_name}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span class="badge badge-blue">{u.role}</span>
                  </td>
                  <td>
                    <span class={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{u.mfa_required ? 'Required' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!store.users.length && !store.loading && <div class="empty">No users</div>}
        </div>
      </div>
    );
  },
});
