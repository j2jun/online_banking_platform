import HeaderBox from '@/components/HeaderBox'
import TotalBalanceBox from '@/components/TotalBalanceBox';

// ponytail: mock data until Plaid/Appwrite are wired in; replace with the signed-in user's accounts.
const loggedIn = { firstName: 'Joseph' };
const accounts: Account[] = [
    { id: '1', name: 'Horizon Checking', officialName: 'Horizon Everyday Checking', currentBalance: 1250, availableBalance: 1250, mask: '1234', institutionId: 'ins_1', type: 'depository', subtype: 'checking', appwriteItemId: '1', sharableId: '1' },
    { id: '2', name: 'Horizon Savings', officialName: 'Horizon High-Yield Savings', currentBalance: 1210.45, availableBalance: 1210.45, mask: '5678', institutionId: 'ins_1', type: 'depository', subtype: 'savings', appwriteItemId: '2', sharableId: '2' },
];

const Home = () => {
    return (
        <section className="home">
            <div className="home-content">
                <header className="home-header">
                    <HeaderBox
                        type="greeting"
                        title="Welcome"
                        user={loggedIn?.firstName || 'Guest'}
                        subtext="Access and manage your account and transactions efficiently"
                    />

                    <TotalBalanceBox
                        accounts={accounts}
                        totalBanks={accounts.length}
                        totalCurrentBalance={accounts.reduce((sum, a) => sum + a.currentBalance, 0)}
                    />
                </header>
            </div>
        </section>
    )
}

export default Home
